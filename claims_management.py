import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError
import threading


class _InMemoryQuery:
    def __init__(self, docs):
        self._docs = list(docs)

    def sort(self, key, direction):
        reverse = bool(direction == -1)
        try:
            self._docs.sort(key=lambda d: d.get(key), reverse=reverse)
        except Exception:
            pass
        return self

    def __iter__(self):
        return iter(self._docs)


class _InMemoryCollection:
    def __init__(self):
        self._docs = []
        self._lock = threading.Lock()

    def create_index(self, *args, **kwargs):
        return None

    def _matches(self, doc, filt):
        if not filt:
            return True
        for key, value in filt.items():
            if doc.get(key) != value:
                return False
        return True

    def find(self, filt=None):
        if not filt:
            return _InMemoryQuery(self._docs)
        return _InMemoryQuery([d for d in self._docs if self._matches(d, filt)])

    def find_one(self, filt):
        if not filt:
            return None
        for d in self._docs:
            if self._matches(d, filt):
                return d
        return None

    def insert_one(self, document):
        with self._lock:
            doc = dict(document)
            if "_id" not in doc:
                doc["_id"] = ObjectId()
            claim_number = doc.get("claim_number")
            owner_id = doc.get("owner_id")
            if claim_number and owner_id:
                for d in self._docs:
                    if d.get("claim_number") == claim_number and d.get("owner_id") == owner_id:
                        raise DuplicateKeyError("duplicate key error")
            self._docs.append(doc)

            class _Res:
                pass

            res = _Res()
            res.inserted_id = doc["_id"]
            return res

    def update_one(self, filt, update):
        with self._lock:
            target = None
            for d in self._docs:
                if self._matches(d, filt):
                    target = d
                    break
            if not target:
                class _Res:
                    pass

                r = _Res()
                r.modified_count = 0
                return r
            sets = update.get("$set", {})
            for k, v in sets.items():
                target[k] = v

            class _Res:
                pass

            r = _Res()
            r.modified_count = 1
            return r

    def delete_one(self, filt):
        with self._lock:
            target = None
            for i, d in enumerate(self._docs):
                if self._matches(d, filt):
                    target = i
                    break
            if target is None:
                class _Res:
                    pass

                r = _Res()
                r.deleted_count = 0
                return r
            self._docs.pop(target)

            class _Res:
                pass

            r = _Res()
            r.deleted_count = 1
            return r


MONGO_URI = os.getenv("MONGODB_URI")
MONGO_DB = os.getenv("MONGODB_DB", "secure_gig_guardian")
MONGO_CLAIMS_COLLECTION = os.getenv("MONGODB_CLAIMS_COLLECTION", "claims")

client = None
collection = None

if MONGO_URI:
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client[MONGO_DB]
        collection = db[MONGO_CLAIMS_COLLECTION]
        collection.create_index([("owner_id", 1), ("claim_number", 1)], unique=True, sparse=True)
    except PyMongoError as exc:
        print(f"MongoDB claims initialization error: {exc}")
        client = None
        collection = _InMemoryCollection()
        print("Using in-memory claims store as fallback.")
else:
    print("MONGODB_URI not set; using in-memory claims store.")
    collection = _InMemoryCollection()


def _serialize_claim(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return {}
    return {
        "id": str(doc.get("_id")),
        "policy_id": str(doc.get("policy_id", "")),
        "claim_number": doc.get("claim_number", ""),
        "title": doc.get("title", ""),
        "description": doc.get("description", ""),
        "claim_amount": float(doc.get("claim_amount", 0)),
        "status": doc.get("status", "pending"),
        "admin_notes": doc.get("admin_notes", ""),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }


def _require_collection() -> Any:
    if collection is None:
        raise RuntimeError("Claims collection is not initialized.")
    return collection


def list_claims(owner_id: str) -> List[Dict[str, Any]]:
    coll = _require_collection()
    return [_serialize_claim(doc) for doc in coll.find({"owner_id": owner_id}).sort("created_at", -1)]


def get_claim(claim_id: str, owner_id: str) -> Optional[Dict[str, Any]]:
    coll = _require_collection()
    try:
        doc = coll.find_one({"_id": ObjectId(claim_id), "owner_id": owner_id})
    except Exception as exc:
        raise ValueError(f"Invalid claim id: {claim_id}") from exc
    return _serialize_claim(doc) if doc else None


def create_claim(payload: Dict[str, Any], owner_id: str) -> Dict[str, Any]:
    coll = _require_collection()
    doc = {
        "owner_id": owner_id,
        "policy_id": str(payload.get("policy_id", "")).strip(),
        "claim_number": str(payload.get("claim_number", "")).strip(),
        "title": str(payload.get("title", "")).strip(),
        "description": str(payload.get("description", "")).strip(),
        "claim_amount": float(payload.get("claim_amount", 0)),
        "status": str(payload.get("status", "pending")).strip() or "pending",
        "admin_notes": str(payload.get("admin_notes", "")).strip(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    try:
        result = coll.insert_one(doc)
        return get_claim(str(result.inserted_id), owner_id)
    except DuplicateKeyError as exc:
        raise ValueError("A claim with this claim number already exists for this user.") from exc
    except PyMongoError as exc:
        raise RuntimeError(f"Failed to create claim: {exc}") from exc


def update_claim(claim_id: str, payload: Dict[str, Any], owner_id: str) -> Optional[Dict[str, Any]]:
    coll = _require_collection()
    update_fields = {}
    for field in ["policy_id", "claim_number", "title", "description", "status", "admin_notes"]:
        if field in payload:
            update_fields[field] = str(payload[field]).strip()
    if "claim_amount" in payload:
        update_fields["claim_amount"] = float(payload["claim_amount"])

    if not update_fields:
        return get_claim(claim_id, owner_id)

    update_fields["updated_at"] = datetime.utcnow()

    try:
        coll.update_one({"_id": ObjectId(claim_id), "owner_id": owner_id}, {"$set": update_fields})
        return get_claim(claim_id, owner_id)
    except Exception as exc:
        raise ValueError(f"Invalid claim id: {claim_id}") from exc


def delete_claim(claim_id: str, owner_id: str) -> bool:
    coll = _require_collection()
    try:
        result = coll.delete_one({"_id": ObjectId(claim_id), "owner_id": owner_id})
    except Exception as exc:
        raise ValueError(f"Invalid claim id: {claim_id}") from exc
    return result.deleted_count > 0

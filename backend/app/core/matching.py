import re
from typing import List, Optional, Tuple, Dict, Any
from sqlmodel import Session, select
from rapidfuzz import fuzz, process
from app.db.models import SKU, SkuAlias

class SkuMatchResult:
    def __init__(self, sku: SKU, matched_alias: str, score: float, is_exact: bool = False):
        self.sku = sku
        self.matched_alias = matched_alias
        self.score = score
        self.is_exact = is_exact

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sku_id": self.sku.id,
            "name": self.sku.name,
            "brand": self.sku.brand,
            "category": self.sku.category,
            "standard_unit": self.sku.standard_unit,
            "matched_alias": self.matched_alias,
            "score": round(self.score, 2),
            "is_exact": self.is_exact
        }

def match_sku(query: str, session: Session, threshold: float = 55.0) -> Optional[SkuMatchResult]:
    """
    Finds the best matching SKU for a given query string (phrase or product name).
    1. Checks exact match against SkuAlias (both raw and hyphen-normalized)
    2. Checks alias containment
    3. Performs RapidFuzz WRatio & token matching with phonetic nearest-match resilience
    """
    if not query:
        return None
    
    clean_q = query.strip().lower()
    norm_q = re.sub(r'[\-_/.]+', ' ', clean_q).strip()

    # Pre-fetch aliases and SKUs
    aliases = session.exec(select(SkuAlias)).all()
    skus_by_id = {s.id: s for s in session.exec(select(SKU)).all()}

    # 1. Exact match check (raw and normalized)
    for a in aliases:
        al = a.alias.lower()
        al_norm = re.sub(r'[\-_/.]+', ' ', al).strip()
        if al in (clean_q, norm_q) or al_norm in (clean_q, norm_q):
            sku = skus_by_id.get(a.sku_id)
            if sku:
                return SkuMatchResult(sku, a.alias, 100.0, is_exact=True)

    # 2. Containment match (query contains alias or alias contains query if >= 3 chars)
    best_containment = None
    best_len = 0
    for a in aliases:
        al = a.alias.lower()
        al_norm = re.sub(r'[\-_/.]+', ' ', al).strip()
        for q_target in (clean_q, norm_q):
            for a_target in (al, al_norm):
                if (len(a_target) >= 3 and a_target in q_target) or (len(q_target) >= 4 and q_target in a_target):
                    if len(a_target) > best_len:
                        sku = skus_by_id.get(a.sku_id)
                        if sku:
                            best_containment = SkuMatchResult(sku, a.alias, 95.0, is_exact=False)
                            best_len = len(a_target)
    
    if best_containment:
        return best_containment

    # 3. RapidFuzz WRatio & token matching
    alias_strings = [a.alias.lower() for a in aliases]
    alias_map = {a.alias.lower(): a for a in aliases}

    # Also include normalized aliases and SKU names directly
    for a in aliases:
        al_norm = re.sub(r'[\-_/.]+', ' ', a.alias.lower()).strip()
        if al_norm not in alias_map:
            alias_strings.append(al_norm)
            alias_map[al_norm] = a

    for s in skus_by_id.values():
        name_lower = s.name.lower()
        if name_lower not in alias_map:
            alias_strings.append(name_lower)
            alias_map[name_lower] = SkuAlias(sku_id=s.id, alias=s.name, is_primary=True)

    match = process.extractOne(
        clean_q,
        alias_strings,
        scorer=fuzz.WRatio
    )

    if match:
        best_str, score, _ = match
        if score >= threshold:
            alias_obj = alias_map[best_str]
            sku = skus_by_id.get(alias_obj.sku_id)
            if sku:
                return SkuMatchResult(sku, best_str, float(score), is_exact=False)

    return None

def match_all_candidates(query: str, session: Session, limit: int = 3) -> List[SkuMatchResult]:
    """Returns top N candidates with scores for clarifying questions when confidence is borderline."""
    if not query:
        return []
    
    clean_q = query.strip().lower()
    aliases = session.exec(select(SkuAlias)).all()
    skus_by_id = {s.id: s for s in session.exec(select(SKU)).all()}
    alias_strings = [a.alias.lower() for a in aliases]
    alias_map = {a.alias.lower(): a for a in aliases}

    matches = process.extract(
        clean_q,
        alias_strings,
        scorer=fuzz.token_sort_ratio,
        limit=limit
    )

    results = []
    seen_skus = set()
    for best_str, score, _ in matches:
        alias_obj = alias_map[best_str]
        sku = skus_by_id.get(alias_obj.sku_id)
        if sku and sku.id not in seen_skus:
            seen_skus.add(sku.id)
            results.append(SkuMatchResult(sku, best_str, float(score), is_exact=(score == 100)))

    return results


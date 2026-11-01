import os
import yaml
import pytest
from app.core.nlu import parse_with_gemini, NluResult

GOLDEN_FILE = os.path.join(os.path.dirname(__file__), "golden_utterances.yaml")

def load_golden_cases():
    with open(GOLDEN_FILE, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
        return data.get("cases", [])

@pytest.mark.parametrize("case", load_golden_cases(), ids=lambda c: c["id"])
def test_golden_utterances(case):
    utterance = case["utterance"]
    draft_ctx = case.get("draft_context")
    expected_intent = case["expected_intent"]

    res: NluResult = parse_with_gemini(utterance, draft_ctx)

    # 1. Pydantic validation guarantee
    assert isinstance(res, NluResult)
    assert res.intent == expected_intent

    # 2. Supplier & payment checks if expected
    if "expected_supplier" in case:
        assert res.supplier_mention == case["expected_supplier"]

    if "expected_payment_mode" in case:
        assert res.payment_mode == case["expected_payment_mode"]

    if "expected_clarification" in case:
        assert res.needs_clarification == case["expected_clarification"]

    # 3. Items checks
    expected_items = case.get("expected_items", [])
    if expected_items:
        items_to_check = res.reminder_items if res.intent in ("remember_item", "remove_reminder") else res.items
        assert len(items_to_check) == len(expected_items)
        for actual, expected in zip(items_to_check, expected_items):
            if "name" in expected:
                # Name should match or be contained
                assert expected["name"].lower() in actual.name_guess.lower() or actual.name_guess.lower() in expected["name"].lower()
            if "quantity" in expected:
                assert actual.quantity == expected["quantity"]
            if "unit" in expected:
                assert actual.unit == expected["unit"]

def test_pydantic_schema_enforcement():
    # Verify NluResult schema fields
    schema = NluResult.model_json_schema()
    assert "properties" in schema
    assert "transcript_roman" in schema["properties"]
    assert "intent" in schema["properties"]
    assert "items" in schema["properties"]
    assert "overall_confidence" in schema["properties"]


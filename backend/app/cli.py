import sys
import uuid
import argparse
from decimal import Decimal
from sqlmodel import Session
from app.db.session import engine
from app.db.seed import seed_database
from app.core.schemas import InboundMessage
from app.core.agent import handle_inbound_message

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def run_say(text: str, merchant_id: str = "m_sharma_kirana"):
    seed_database()
    with Session(engine) as session:
        print(f"\n📢 Munim Processing: '{text}'")
        msg_id = f"cli_{uuid.uuid4().hex[:8]}"
        inbound = InboundMessage(
            channel="web",
            sender_id="cli_merchant",
            message_id=msg_id,
            text=text,
            merchant_id=merchant_id
        )

        outbounds = handle_inbound_message(inbound, session)
        for out in outbounds:
            print("\n" + "="*52)
            print(f"💬 Munim Reply:\n{out.display_text}")
            if out.speech_text:
                print(f"🔊 Audio Text: {out.speech_text}")
            
            # Print Suggestions if present
            if out.suggestions and out.suggestions.items:
                print("\n💡 " + out.suggestions.title + ":")
                for it in out.suggestions.items:
                    sel = "[X]" if it.selected else "[ ]"
                    print(f"   {sel} {it.label} ({it.demand_count}x maanga gaya)")
                print(f"   Actions: {', '.join(out.suggestions.actions)}")

            # Print Action Buttons
            if out.buttons:
                print("\n🔘 Available Actions:")
                for b in out.buttons:
                    print(f"   [{b.label}]")
            print("="*52 + "\n")

def main():
    parser = argparse.ArgumentParser(description="Munim Kirana Assistant CLI")
    subparsers = parser.add_subparsers(dest="command")
    
    say_parser = subparsers.add_parser("say", help="Speak or input an order/reminder query")
    say_parser.add_argument("utterance", type=str, help="Hinglish order or reminder text")
    
    args = parser.parse_args()
    if args.command == "say":
        run_say(args.utterance)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()

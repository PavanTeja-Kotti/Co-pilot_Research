from phi.agent import Agent
from phi.model.groq import Groq
from phi.tools.duckduckgo import DuckDuckGo
#from phi.tools.yfinance import YFinanceTools
from rich.prompt import Prompt
import os
import typer
os.environ["GROQ_API_KEY"] = "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"
def multi_agent(user: str = "user"):
    web_agent = Agent(
        name="Web Agent",
        role="Search the web for information",
        model=Groq(id="llama-3.1-70b-versatile"),
        tools=[DuckDuckGo()],
        instructions=["Always include sources", "Use tables to display data"],
        show_tool_calls=True,
        markdown=True,
        read_chat_history=True,
    )
    while True:
        message = Prompt.ask(f"[bold] :sunglasses: {user} [/bold]")
        if message in ("exit", "bye"):
            break

        while True:
            try:
                web_agent.print_response(message,stream=True)
            except Exception as e:
                print("exception occured:" ,e)
                continue
            break

#multi_agent.print_response("give me the latest news")

if __name__ == "__main__":
    typer.run(multi_agent)
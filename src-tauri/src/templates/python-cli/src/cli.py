import click
from rich.console import Console

console = Console()


@click.group()
@click.version_option()
def main() -> None:
    """{{project_name}} — a command-line tool."""


@main.command()
@click.argument("name", default="World")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output")
def hello(name: str, verbose: bool) -> None:
    """Say hello."""
    if verbose:
        console.print(f"[dim]Verbose mode enabled[/dim]")
    console.print(f"[bold green]Hello, {name}![/bold green]")


if __name__ == "__main__":
    main()

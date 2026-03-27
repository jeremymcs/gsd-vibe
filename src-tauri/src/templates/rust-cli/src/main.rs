use clap::Parser;

/// {{project_name}} — a command-line tool
#[derive(Parser, Debug)]
#[command(name = "{{project_name}}", version, about)]
struct Args {
    /// Input to process
    #[arg(short, long)]
    input: Option<String>,

    /// Enable verbose output
    #[arg(short, long)]
    verbose: bool,
}

fn main() {
    let args = Args::parse();

    if args.verbose {
        println!("Verbose mode enabled");
    }

    match args.input {
        Some(input) => println!("Processing: {input}"),
        None => println!("Hello from {{project_name}}!"),
    }
}

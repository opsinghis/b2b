import { Button } from "@b2b/ui";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to B2B Portal</h1>
        <p className="text-muted-foreground mb-8">
          Your one-stop destination for managing your B2B partnerships
        </p>
        <Button>Get Started</Button>
      </div>
    </div>
  );
}

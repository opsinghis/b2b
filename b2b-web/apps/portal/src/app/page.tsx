import { Button } from "@b2b/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">B2B Customer Portal</h1>
        <p className="text-gray-600 mb-8">
          Welcome to your B2B partner portal
        </p>
        <Button>Sign In</Button>
      </div>
    </main>
  );
}

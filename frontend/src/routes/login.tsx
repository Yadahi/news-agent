import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { login, register } from "@/lib/api";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    const token = localStorage.getItem("token");
    if (token) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () =>
      isRegister ? register(username, password) : login(username, password),
    onSuccess: (data) => {
      console.log("logged in", data);
      if (isRegister) {
        setIsRegister(false);
        setPassword("");
        setConfirmPassword("");
      } else {
        localStorage.setItem("token", data.token);
        navigate({ to: "/dashboard" });
      }
    },
    onError: (error) => {
      console.log("failed", error);
    },
  });

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();

    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    mutation.mutate();
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isRegister ? "Create Account" : "Log In"}</CardTitle>
          <CardDescription>
            {isRegister
              ? "Register to manage your AI newsroom"
              : "Welcome back to News Agent"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (mutation.isError) mutation.reset();
                }}
                placeholder="Enter your username"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (mutation.isError) mutation.reset();
                }}
                placeholder="Enter your password"
              />
            </div>
            {isRegister && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (mutation.isError) mutation.reset();
                  }}
                  placeholder="Confirm your password"
                />
              </div>
            )}
            {(error || mutation.error) && (
              <p className="text-sm text-red-500">
                {error || mutation.error?.message}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? "Loading..."
                : isRegister
                  ? "Register"
                  : "Log In"}
            </Button>
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-muted-foreground hover:underline"
            >
              {isRegister
                ? "Already have an account? Log in"
                : "Don't have an account? Register"}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

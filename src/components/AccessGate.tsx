import { useState, useCallback } from "react";
import { Lock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkEntry, unlock } from "@/lib/gate";

interface AccessGateProps {
  children: React.ReactNode;
  unlocked: boolean;
  onUnlock: () => void;
}

export function AccessGate ({ children, unlocked, onUnlock }: AccessGateProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleSubmit = useCallback(() => {
    if (checkEntry(value)) {
      unlock();
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setValue("");
    }
  }, [value, onUnlock]);

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <BarChart3 className="h-8 w-8 text-primary" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Auditoria HMUE</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Insira o código de acesso para continuar
          </p>
        </div>

        <div
          className={`space-y-3 ${shaking ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
          style={shaking ? { animation: "shake 0.4s ease-in-out" } : {}}
        >
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="••••••••••••"
              className={`pl-10 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
              autoFocus
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">Código de acesso incorreto.</p>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={!value}>
            Entrar
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-lg text-muted-foreground mb-1">Page not found</p>
      <p className="text-sm text-muted-foreground mb-6">
        The path <code className="bg-muted px-2 py-0.5 rounded">{location.pathname}</code> doesn't exist
      </p>
      <Button asChild>
        <Link to="/">
          <Home className="h-4 w-4 mr-2" />
          Back to Overview
        </Link>
      </Button>
    </div>
  );
};

export default NotFound;

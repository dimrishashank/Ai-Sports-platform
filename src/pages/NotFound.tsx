import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <AppLayout>
      <div className="flex-grow flex items-center justify-center px-4 py-20">
        <div className="text-center">
          <div
            className="text-[120px] font-black text-gray-200 leading-none mb-4"
          >
            404
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight uppercase">Page <span className="text-blue-600">Not Found</span></h2>
          <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">
            The route <code className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{location.pathname}</code> doesn't exist on this platform.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" /> Go Back Home
          </Link>
        </div>
      </div>
    </AppLayout>
  );
};

export default NotFound;

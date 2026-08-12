import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export default function DebugCategoriesPage() {
  const categories = useQuery(api.products.getUniqueCategoriesDebug);
  const clearProducts = useMutation(api.products.devClearAllProducts);
  const [isClearing, setIsClearing] = useState(false);
  const [result, setResult] = useState<{ deletedCount: number } | null>(null);

  const handleClearDatabase = async () => {
    if (!window.confirm("⚠️ Are you SURE? This will DELETE ALL PRODUCTS from the dev database!\n\nType 'DELETE' in the next prompt to confirm.")) {
      return;
    }

    const confirmation = window.prompt("Type DELETE to confirm:");
    if (confirmation !== "DELETE") {
      alert("Cancelled");
      return;
    }

    setIsClearing(true);
    try {
      const res = await clearProducts({ confirmDelete: true });
      setResult(res);
      setIsClearing(false);
    } catch (err) {
      alert(`Error: ${err}`);
      setIsClearing(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔧 Dev Database Tools</h1>

      <div className="mb-8 p-4 border border-yellow-300 bg-yellow-50 rounded">
        <p className="text-sm text-yellow-800">⚠️ <strong>Development only!</strong> Never use these tools on production.</p>
      </div>

      {/* Categories Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Database Categories</h2>
        {categories === undefined ? (
          <p>Loading...</p>
        ) : (
          <div>
            <p className="mb-3 text-sm text-gray-600">Found {categories.length} unique categories:</p>
            <ul className="space-y-2 font-mono text-sm bg-gray-100 p-4 rounded max-h-48 overflow-auto">
              {categories.map((cat) => (
                <li key={cat}>"{cat}"</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Clear Database Section */}
      <div className="p-4 border-2 border-red-300 bg-red-50 rounded">
        <h2 className="text-xl font-semibold mb-2 text-red-900">⚠️ Clear All Products</h2>
        <p className="text-sm text-red-800 mb-4">This will delete ALL products from the dev database. You will need to add new test data.</p>

        <button
          onClick={handleClearDatabase}
          disabled={isClearing}
          className="px-6 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          {isClearing ? "Clearing..." : "Clear All Products"}
        </button>

        {result && (
          <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded">
            <p className="text-green-800 font-semibold">✓ Success!</p>
            <p className="text-green-700">Deleted {result.deletedCount} products</p>
          </div>
        )}
      </div>
    </div>
  );
}

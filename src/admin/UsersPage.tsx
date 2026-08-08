import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function UsersPage() {
  const users = useQuery(api.admin.listUsers);

  if (users === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date Added
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {users.map((user) => (
            <tr
              key={user._id}
              class="hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                window.location.href = `/admin/users/${user._id}`;
              }}
            >
              <td class="px-6 py-4 whitespace-nowrap">
                {user.email ? (
                  <a
                    href={`/admin/users/${user._id}`}
                    class="text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {user.email}
                  </a>
                ) : (
                  <a
                    href={`/admin/users/${user._id}`}
                    class="text-gray-500 italic hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {user.isAnonymous ? "Anonymous user" : "No email"}
                  </a>
                )}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(user._creationTime)}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={2} class="px-6 py-4 text-center text-sm text-gray-500">
                No users found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

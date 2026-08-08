import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

function formatCost(cost: number) {
  if (!Number.isFinite(cost) || cost === 0) return "$0";
  if (cost < 0.0001) return `$${cost.toFixed(8)}`;
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatTokens(tokens: number) {
  return tokens.toLocaleString();
}

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortModelName(model: string) {
  const slash = model.lastIndexOf("/");
  return slash >= 0 ? model.slice(slash + 1) : model;
}

export function CostsPage() {
  const data = useQuery(api.admin.listAiCostLogs, { limit: 200 });

  if (data === undefined) {
    return <div>Loading...</div>;
  }

  const { logs, summary } = data;

  return (
    <div class="space-y-8">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">AI costs</h2>
        <p class="text-sm text-gray-600 mt-1">
          Usage from the last week of AI generation calls (logs older than 7 days are deleted automatically).
          Showing the most recent {logs.length} operations.
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="text-3xl font-bold text-gray-900">
            {formatCost(summary.totalCost)}
          </div>
          <div class="text-sm text-gray-500">Total cost</div>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <div class="text-3xl font-bold text-gray-900">
            {formatTokens(summary.totalTokens)}
          </div>
          <div class="text-sm text-gray-500">Total tokens</div>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <div class="text-3xl font-bold text-gray-900">
            {summary.operationCount.toLocaleString()}
          </div>
          <div class="text-sm text-gray-500">Operations</div>
        </div>
      </div>

      <section>
        <h3 class="text-lg font-semibold text-gray-900 mb-3">By model</h3>
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calls
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prompt
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total tokens
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {summary.byModel.map((model) => (
                <tr key={model.model}>
                  <td class="px-6 py-3 text-sm text-gray-900" title={model.model}>
                    {shortModelName(model.model)}
                  </td>
                  <td class="px-6 py-3 text-sm text-gray-500 text-right">
                    {model.calls.toLocaleString()}
                  </td>
                  <td class="px-6 py-3 text-sm text-gray-500 text-right">
                    {formatTokens(model.promptTokens)}
                  </td>
                  <td class="px-6 py-3 text-sm text-gray-500 text-right">
                    {formatTokens(model.completionTokens)}
                  </td>
                  <td class="px-6 py-3 text-sm text-gray-500 text-right">
                    {formatTokens(model.totalTokens)}
                  </td>
                  <td class="px-6 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCost(model.cost)}
                  </td>
                </tr>
              ))}
              {summary.byModel.length === 0 && (
                <tr>
                  <td colSpan={6} class="px-6 py-4 text-center text-sm text-gray-500">
                    No AI usage logged yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 class="text-lg font-semibold text-gray-900 mb-3">Recent operations</h3>
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  When
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Models
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log._id} class="align-top">
                  <td class="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {formatDateTime(log._creationTime)}
                  </td>
                  <td class="px-6 py-3 text-sm text-gray-900">
                    {log.description}
                  </td>
                  <td class="px-6 py-3 text-sm text-gray-500">
                    <div class="space-y-1">
                      {log.models.map((model) => (
                        <div key={model.model} title={model.model}>
                          {shortModelName(model.model)}
                          <span class="text-gray-400">
                            {" "}
                            · {model.calls}× · {formatCost(model.cost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td class="px-6 py-3 text-sm text-gray-500 text-right whitespace-nowrap">
                    {formatTokens(log.totalTokens)}
                  </td>
                  <td class="px-6 py-3 text-sm text-gray-900 text-right font-medium whitespace-nowrap">
                    {formatCost(log.totalCost)}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} class="px-6 py-4 text-center text-sm text-gray-500">
                    No AI usage logged yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import TextOptimizer from "../islands/TextOptimizer.tsx";

export default function Home() {
  return (
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-7xl mx-auto px-4">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-gray-900 mb-2">
            日本語トークン効率最適化ツール
          </h1>
          <p class="text-lg text-gray-600">
            Sudachi同義語辞書を使用して、読みやすさを保ちながら日本語表現を最適化します
          </p>
          <div class="mt-4 text-sm text-gray-500">
            ✅ 日本語のみ最適化 ✅ トークン削減効果のある変換を適用 ✅
            可読性を重視
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          {/* 入力エリア */}
          <div class="bg-white rounded-lg shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">
              最適化したい文章
            </h2>
            <textarea
              id="inputText"
              class="w-full h-80 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ここに最適化したい日本語文章を入力してください..."
            />
            <div class="mt-4 flex gap-3">
              <button
                type="button"
                id="optimizeBtn"
                class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                最適化実行
              </button>
              <button
                type="button"
                id="clearBtn"
                class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                クリア
              </button>
            </div>
          </div>

          {/* 出力エリア */}
          <div class="bg-white rounded-lg shadow-lg p-6">
            <div class="flex justify-between items-center mb-4">
              <div class="flex items-center gap-6">
                <h2 class="text-xl font-semibold text-gray-800">
                  最適化結果（差分表示）
                </h2>
                <div class="flex items-center gap-4 text-sm text-gray-600">
                  <div class="flex items-center gap-2">
                    <span class="w-4 h-4 bg-red-200 border border-red-300 rounded">
                    </span>
                    <span>削除</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-4 h-4 bg-green-200 border border-green-300 rounded">
                    </span>
                    <span>追加</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                id="copyBtn"
                class="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                title="コピー"
                disabled
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
            <div
              id="diffContainer"
              class="w-full h-80 border border-gray-300 rounded-lg overflow-y-auto"
            >
              <div class="p-4 text-gray-500 text-center">
                最適化結果の差分がここに表示されます...
              </div>
            </div>
            <div id="tokenInfo" class="mt-4 text-sm text-gray-600">
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <span class="font-medium">元のトークン数:</span>
                  <span id="originalTokens" class="ml-2">-</span>
                </div>
                <div>
                  <span class="font-medium">最適化後トークン数:</span>
                  <span id="optimizedTokens" class="ml-2">-</span>
                </div>
                <div>
                  <span class="font-medium">削減率:</span>
                  <span id="reductionRate" class="ml-2">-</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ローディング表示 */}
        <div
          id="loading"
          class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div class="bg-white p-6 rounded-lg shadow-xl">
            <div class="flex items-center space-x-3">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600">
              </div>
              <span class="text-lg font-medium">最適化中...</span>
            </div>
          </div>
        </div>

        <TextOptimizer />
      </div>
    </div>
  );
}

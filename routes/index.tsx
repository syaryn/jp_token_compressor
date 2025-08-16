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
            Sudachi同義語辞書を使用して、より効率的な日本語表現に変換します
          </p>
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
              <h2 class="text-xl font-semibold text-gray-800">
                最適化結果
              </h2>
              <button
                type="button"
                id="copyBtn"
                class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled
              >
                コピー
              </button>
            </div>
            <div
              id="outputText"
              class="w-full h-80 p-4 border border-gray-300 rounded-lg bg-gray-50 whitespace-pre-wrap overflow-y-auto"
            >
              最適化結果がここに表示されます...
            </div>
            <div id="tokenInfo" class="mt-4 text-sm text-gray-600 hidden">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <span class="font-medium">元のトークン数:</span>
                  <span id="originalTokens" class="ml-2"></span>
                </div>
                <div>
                  <span class="font-medium">最適化後トークン数:</span>
                  <span id="optimizedTokens" class="ml-2"></span>
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

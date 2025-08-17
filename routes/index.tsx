import TextOptimizer from "../islands/TextOptimizer.tsx";

export default function Home() {
  return (
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-7xl mx-auto px-4">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-gray-900 mb-2">
            日本語トークン効率最適化ツール
          </h1>
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

        {/* 仕組み説明セクション */}
        <div class="mt-16 bg-white rounded-lg shadow-lg p-8">
          <div class="max-w-4xl mx-auto">
            <h2 class="text-3xl font-bold text-gray-900 mb-6 text-center">
              トークン最適化の仕組み
            </h2>

            <div class="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 class="text-xl font-semibold text-gray-800 mb-3">
                  💰 AIサービスのコスト削減
                </h3>
                <p class="text-gray-600 leading-relaxed mb-4">
                  ChatGPT、Claude、GeminiなどのAIサービスは<strong>
                    トークン数に応じて課金
                  </strong>されます。このツールは同じ意味を保ちながらトークン数を削減し、API利用コストを効果的に削減します。
                </p>
                <ul class="text-sm text-gray-600 space-y-1">
                  <li>• 数%のコスト削減効果</li>
                  <li>• 意味・可読性を完全保持</li>
                  <li>• 短文で高い効果、長文では控えめな効果</li>
                </ul>
              </div>

              <div>
                <h3 class="text-xl font-semibold text-gray-800 mb-3">
                  📚 Sudachi同義語辞書の活用
                </h3>
                <p class="text-gray-600 leading-relaxed mb-4">
                  WorksApplications社開発の高精度な「Sudachi同義語辞書」を採用。<strong>
                    64,747個の辞書単語
                  </strong>と<strong>
                    15,085個の同義語マッピング
                  </strong>により、日本語に特化した最適化を実現します。
                </p>
                <ul class="text-sm text-gray-600 space-y-1">
                  <li>• 企業レベルの日本語処理精度</li>
                  <li>• 毎日自動辞書更新</li>
                  <li>• 形態素解析ベースの高精度変換</li>
                </ul>
              </div>
            </div>

            <div class="border-t pt-8">
              <h3 class="text-xl font-semibold text-gray-800 mb-4 text-center">
                最適化処理フロー
              </h3>
              <div class="grid md:grid-cols-4 gap-4 text-center">
                <div class="p-4 bg-blue-50 rounded-lg">
                  <div class="text-2xl font-bold text-blue-600 mb-2">1</div>
                  <h4 class="font-medium text-gray-800 mb-2">形態素解析</h4>
                  <p class="text-sm text-gray-600">
                    wakachigakiで日本語文章を単語単位に分割
                  </p>
                </div>
                <div class="p-4 bg-green-50 rounded-lg">
                  <div class="text-2xl font-bold text-green-600 mb-2">2</div>
                  <h4 class="font-medium text-gray-800 mb-2">同義語検索</h4>
                  <p class="text-sm text-gray-600">
                    Sudachi辞書から同義語候補を取得
                  </p>
                </div>
                <div class="p-4 bg-yellow-50 rounded-lg">
                  <div class="text-2xl font-bold text-yellow-600 mb-2">3</div>
                  <h4 class="font-medium text-gray-800 mb-2">トークン計測</h4>
                  <p class="text-sm text-gray-600">
                    js-tiktokenでGPT-4o互換トークン数を計測
                  </p>
                </div>
                <div class="p-4 bg-purple-50 rounded-lg">
                  <div class="text-2xl font-bold text-purple-600 mb-2">4</div>
                  <h4 class="font-medium text-gray-800 mb-2">
                    最適置換
                  </h4>
                  <p class="text-sm text-gray-600">
                    最もトークン効率の良い表現に自動変換
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 class="text-lg font-semibold text-gray-800 mb-3">
                最適化効果の実例
              </h3>
              <div class="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 class="font-medium text-gray-700 mb-2">
                    最適化前（21トークン）
                  </h4>
                  <p class="text-gray-600 bg-white p-3 rounded border">
                    「コンピュータとアルゴリズムを活用したデータベースシステム」
                  </p>
                </div>
                <div>
                  <h4 class="font-medium text-gray-700 mb-2">
                    最適化後（19トークン）
                  </h4>
                  <p class="text-gray-600 bg-white p-3 rounded border">
                    「電算機とアルゴリズムを使用したデータベースシステム」
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 mt-3 text-center">
                <strong>約10%のトークン削減</strong>{" "}
                → 短文での効果例（長文では数%程度の改善）
              </p>
            </div>

            <div class="mt-6 text-center">
              <p class="text-sm text-gray-500">
                ChatGPT、Claude、GeminiなどのAIサービスを業務で活用される企業・個人の方に最適です。<br />
                大量のテキスト処理におけるAPI利用コストの最適化を実現します。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

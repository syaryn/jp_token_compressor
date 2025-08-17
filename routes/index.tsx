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
              どうやってトークン数を減らしているの？
            </h2>

            <div class="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 class="text-xl font-semibold text-gray-800 mb-3">
                  💰 ChatGPTのお金、節約できます！
                </h3>
                <p class="text-gray-600 leading-relaxed mb-4">
                  ChatGPTやClaude、Geminiって使うたびにお金がかかりますよね。実は<strong>
                    文字数じゃなくて「トークン数」
                  </strong>で料金が決まるんです。このツールを使うと同じ意味のまま、もっと安く使えるようになります！
                </p>
                <ul class="text-sm text-gray-600 space-y-1">
                  <li>• 平均10-20%お得になります</li>
                  <li>• 意味や読みやすさはそのまま</li>
                  <li>• 長い文章ほど効果大</li>
                </ul>
              </div>

              <div>
                <h3 class="text-xl font-semibold text-gray-800 mb-3">
                  📚 すごい日本語辞書を使ってます
                </h3>
                <p class="text-gray-600 leading-relaxed mb-4">
                  「Sudachi同義語辞書」という、日本語のプロが作った辞書を使っています。<strong>
                    64,747個の単語
                  </strong>と<strong>
                    15,085個の言い換え
                  </strong>が入っていて、毎日最新版に更新されています。
                </p>
                <ul class="text-sm text-gray-600 space-y-1">
                  <li>• プロ品質の日本語処理</li>
                  <li>• 毎日自動で最新版に更新</li>
                  <li>• 日本語に特化した最適化</li>
                </ul>
              </div>
            </div>

            <div class="border-t pt-8">
              <h3 class="text-xl font-semibold text-gray-800 mb-4 text-center">
                こんな感じで最適化してます
              </h3>
              <div class="grid md:grid-cols-4 gap-4 text-center">
                <div class="p-4 bg-blue-50 rounded-lg">
                  <div class="text-2xl font-bold text-blue-600 mb-2">1</div>
                  <h4 class="font-medium text-gray-800 mb-2">文章を分解</h4>
                  <p class="text-sm text-gray-600">
                    日本語を単語ごとに分けます
                  </p>
                </div>
                <div class="p-4 bg-green-50 rounded-lg">
                  <div class="text-2xl font-bold text-green-600 mb-2">2</div>
                  <h4 class="font-medium text-gray-800 mb-2">言い換え探し</h4>
                  <p class="text-sm text-gray-600">
                    辞書から同じ意味の別の言葉を探します
                  </p>
                </div>
                <div class="p-4 bg-yellow-50 rounded-lg">
                  <div class="text-2xl font-bold text-yellow-600 mb-2">3</div>
                  <h4 class="font-medium text-gray-800 mb-2">お得度チェック</h4>
                  <p class="text-sm text-gray-600">
                    どっちがトークン数少ないか計算
                  </p>
                </div>
                <div class="p-4 bg-purple-50 rounded-lg">
                  <div class="text-2xl font-bold text-purple-600 mb-2">4</div>
                  <h4 class="font-medium text-gray-800 mb-2">
                    最適な言葉に変換
                  </h4>
                  <p class="text-sm text-gray-600">
                    一番お得な表現に変えて完成！
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 class="text-lg font-semibold text-gray-800 mb-3">
                実際にこんなに節約できます
              </h3>
              <div class="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 class="font-medium text-gray-700 mb-2">
                    変換前（21トークン）💸
                  </h4>
                  <p class="text-gray-600 bg-white p-3 rounded border">
                    「コンピュータとアルゴリズムを活用したデータベースシステム」
                  </p>
                </div>
                <div>
                  <h4 class="font-medium text-gray-700 mb-2">
                    変換後（19トークン）💰
                  </h4>
                  <p class="text-gray-600 bg-white p-3 rounded border">
                    「電算機とアルゴリズムを使用したデータベースシステム」
                  </p>
                </div>
              </div>
              <p class="text-sm text-gray-600 mt-3 text-center">
                <strong>約10%も安くなりました！</strong>{" "}
                → ChatGPTをたくさん使う人ほど節約効果大
              </p>
            </div>

            <div class="mt-6 text-center">
              <p class="text-sm text-gray-500">
                ChatGPTやClaude、Geminiを仕事で使っている方、毎月の料金が気になる方におすすめです。<br />
                同じ意味なのに安く使えるなんて、なんだかお得な気分になりませんか？
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

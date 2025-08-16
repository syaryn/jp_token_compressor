import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

export default function TextOptimizer() {
  const inputText = useSignal("");
  const outputText = useSignal("");
  const isLoading = useSignal(false);
  const originalTokens = useSignal(0);
  const optimizedTokens = useSignal(0);

  // 差分表示をレンダリングする関数
  function renderDiffView(
    container: HTMLElement,
    originalText: string,
    optimizedText: string,
  ) {
    const diffHtml = generateCharDiff(originalText, optimizedText);

    container.innerHTML =
      `<div class="p-4 whitespace-pre-wrap leading-relaxed font-mono text-sm">${diffHtml}</div>`;
  }

  // 文字レベルのdiffを生成する関数
  function generateCharDiff(oldText: string, newText: string): string {
    const oldChars = Array.from(oldText);
    const newChars = Array.from(newText);

    // 簡単なLCS (Longest Common Subsequence) アルゴリズム
    const lcs = computeLCS(oldChars, newChars);

    const result: string[] = [];
    let oldIndex = 0;
    let newIndex = 0;
    let lcsIndex = 0;

    while (oldIndex < oldChars.length || newIndex < newChars.length) {
      if (lcsIndex < lcs.length) {
        const [lcsOldIndex, lcsNewIndex] = lcs[lcsIndex];

        // 削除された文字
        while (oldIndex < lcsOldIndex) {
          result.push(
            `<span class="bg-red-200 text-red-800 px-1 rounded">${
              escapeHtml(oldChars[oldIndex])
            }</span>`,
          );
          oldIndex++;
        }

        // 追加された文字
        while (newIndex < lcsNewIndex) {
          result.push(
            `<span class="bg-green-200 text-green-800 px-1 rounded">${
              escapeHtml(newChars[newIndex])
            }</span>`,
          );
          newIndex++;
        }

        // 共通の文字
        if (oldIndex < oldChars.length && newIndex < newChars.length) {
          result.push(escapeHtml(oldChars[oldIndex]));
          oldIndex++;
          newIndex++;
        }

        lcsIndex++;
      } else {
        // 残りの文字を処理
        while (oldIndex < oldChars.length) {
          result.push(
            `<span class="bg-red-200 text-red-800 px-1 rounded">${
              escapeHtml(oldChars[oldIndex])
            }</span>`,
          );
          oldIndex++;
        }

        while (newIndex < newChars.length) {
          result.push(
            `<span class="bg-green-200 text-green-800 px-1 rounded">${
              escapeHtml(newChars[newIndex])
            }</span>`,
          );
          newIndex++;
        }
      }
    }

    return result.join("");
  }

  // 最長共通部分列を計算
  function computeLCS(
    oldChars: string[],
    newChars: string[],
  ): [number, number][] {
    const m = oldChars.length;
    const n = newChars.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() =>
      Array(n + 1).fill(0)
    );

    // DPテーブルを構築
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (oldChars[i - 1] === newChars[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // LCSを逆算
    const lcs: [number, number][] = [];
    let i = m;
    let j = n;

    while (i > 0 && j > 0) {
      if (oldChars[i - 1] === newChars[j - 1]) {
        lcs.unshift([i - 1, j - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }

  // HTMLエスケープ
  function escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  useEffect(() => {
    const optimizeBtn = document.getElementById("optimizeBtn");
    const clearBtn = document.getElementById("clearBtn");
    const copyBtn = document.getElementById("copyBtn");
    const inputTextArea = document.getElementById(
      "inputText",
    ) as HTMLTextAreaElement;
    const diffContainer = document.getElementById("diffContainer");
    const loadingDiv = document.getElementById("loading");
    const originalTokensSpan = document.getElementById("originalTokens");
    const optimizedTokensSpan = document.getElementById("optimizedTokens");
    const reductionRateSpan = document.getElementById("reductionRate");

    async function optimizeText() {
      const text = inputTextArea?.value.trim();
      if (!text) {
        alert("最適化したい文章を入力してください。");
        return;
      }

      isLoading.value = true;
      loadingDiv?.classList.remove("hidden");

      try {
        const response = await fetch("/api/optimize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error("最適化処理に失敗しました");
        }

        const data = await response.json();

        inputText.value = text;
        outputText.value = data.optimized;
        originalTokens.value = data.tokenCount.original;
        optimizedTokens.value = data.tokenCount.optimized;

        // diffContainerに差分表示をレンダリング
        if (diffContainer) {
          renderDiffView(diffContainer, text, data.optimized);
        }

        if (originalTokensSpan) {
          originalTokensSpan.textContent = data.tokenCount.original.toString();
        }

        if (optimizedTokensSpan) {
          optimizedTokensSpan.textContent = data.tokenCount.optimized
            .toString();
        }

        // 削減率を計算して表示
        if (reductionRateSpan) {
          const original = data.tokenCount.original;
          const optimized = data.tokenCount.optimized;
          const reduction = original - optimized;
          const reductionRate = original > 0 ? (reduction / original * 100) : 0;

          if (reduction > 0) {
            reductionRateSpan.textContent = `-${reduction} (-${
              reductionRate.toFixed(1)
            }%)`;
            reductionRateSpan.className = "ml-2 text-green-600 font-medium";
          } else if (reduction === 0) {
            reductionRateSpan.textContent = "変化なし";
            reductionRateSpan.className = "ml-2 text-gray-500";
          } else {
            reductionRateSpan.textContent = `+${Math.abs(reduction)} (+${
              Math.abs(reductionRate).toFixed(1)
            }%)`;
            reductionRateSpan.className = "ml-2 text-red-600 font-medium";
          }
        }

        copyBtn?.removeAttribute("disabled");
      } catch (error) {
        console.error("Error:", error);
        alert("最適化処理中にエラーが発生しました。");
      } finally {
        isLoading.value = false;
        loadingDiv?.classList.add("hidden");
      }
    }

    function clearText() {
      if (inputTextArea) {
        inputTextArea.value = "";
      }

      if (diffContainer) {
        diffContainer.innerHTML = `<div class="p-4 text-gray-500 text-center">
            最適化結果の差分がここに表示されます...
          </div>`;
      }

      // トークン情報をリセット
      if (originalTokensSpan) {
        originalTokensSpan.textContent = "-";
      }
      if (optimizedTokensSpan) {
        optimizedTokensSpan.textContent = "-";
      }
      if (reductionRateSpan) {
        reductionRateSpan.textContent = "-";
        reductionRateSpan.className = "ml-2";
      }
      copyBtn?.setAttribute("disabled", "true");

      inputText.value = "";
      outputText.value = "";
      originalTokens.value = 0;
      optimizedTokens.value = 0;
    }

    async function copyToClipboard() {
      try {
        await navigator.clipboard.writeText(outputText.value);

        // 一時的にボタンの色を変更
        if (copyBtn) {
          copyBtn.classList.remove("bg-green-600", "hover:bg-green-700");
          copyBtn.classList.add("bg-blue-600");
          copyBtn.title = "コピー完了!";

          setTimeout(() => {
            copyBtn.classList.remove("bg-blue-600");
            copyBtn.classList.add("bg-green-600", "hover:bg-green-700");
            copyBtn.title = "コピー";
          }, 1000);
        }
      } catch (error) {
        console.error("Failed to copy text:", error);
        alert("コピーに失敗しました。");
      }
    }

    optimizeBtn?.addEventListener("click", optimizeText);
    clearBtn?.addEventListener("click", clearText);
    copyBtn?.addEventListener("click", copyToClipboard);

    // キーボードショートカット（Ctrl+Enter で最適化）
    inputTextArea?.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        optimizeText();
      }
    });

    // クリーンアップ
    return () => {
      optimizeBtn?.removeEventListener("click", optimizeText);
      clearBtn?.removeEventListener("click", clearText);
      copyBtn?.removeEventListener("click", copyToClipboard);
    };
  }, []);

  return null; // This island doesn't render anything, it just adds behavior
}

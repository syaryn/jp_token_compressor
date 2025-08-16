import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

export default function TextOptimizer() {
  const inputText = useSignal("");
  const outputText = useSignal("");
  const isLoading = useSignal(false);
  const originalTokens = useSignal(0);
  const optimizedTokens = useSignal(0);

  useEffect(() => {
    const optimizeBtn = document.getElementById("optimizeBtn");
    const clearBtn = document.getElementById("clearBtn");
    const copyBtn = document.getElementById("copyBtn");
    const inputTextArea = document.getElementById(
      "inputText",
    ) as HTMLTextAreaElement;
    const outputDiv = document.getElementById("outputText");
    const loadingDiv = document.getElementById("loading");
    const tokenInfo = document.getElementById("tokenInfo");
    const originalTokensSpan = document.getElementById("originalTokens");
    const optimizedTokensSpan = document.getElementById("optimizedTokens");

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

        outputText.value = data.optimized;
        originalTokens.value = data.tokenCount.original;
        optimizedTokens.value = data.tokenCount.optimized;

        if (outputDiv) {
          outputDiv.textContent = data.optimized;
        }

        if (originalTokensSpan) {
          originalTokensSpan.textContent = data.tokenCount.original.toString();
        }

        if (optimizedTokensSpan) {
          optimizedTokensSpan.textContent = data.tokenCount.optimized
            .toString();
        }

        tokenInfo?.classList.remove("hidden");
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

      if (outputDiv) {
        outputDiv.textContent = "最適化結果がここに表示されます...";
      }

      tokenInfo?.classList.add("hidden");
      copyBtn?.setAttribute("disabled", "true");

      inputText.value = "";
      outputText.value = "";
      originalTokens.value = 0;
      optimizedTokens.value = 0;
    }

    async function copyToClipboard() {
      try {
        await navigator.clipboard.writeText(outputText.value);

        // 一時的にボタンテキストを変更
        if (copyBtn) {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = "コピー完了!";
          copyBtn.classList.remove("bg-green-600", "hover:bg-green-700");
          copyBtn.classList.add("bg-blue-600");

          setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove("bg-blue-600");
            copyBtn.classList.add("bg-green-600", "hover:bg-green-700");
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

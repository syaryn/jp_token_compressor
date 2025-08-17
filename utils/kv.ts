/**
 * Deno KV用ユーティリティ関数
 * 同義語辞書のKVストレージ管理機能
 */

// KVインスタンスの初期化
let kv: Deno.Kv | null = null;

export async function getKvInstance(): Promise<Deno.Kv> {
  if (!kv) {
    kv = await Deno.openKv();
  }
  return kv;
}

// KVキー設計
export const KV_KEYS = {
  synonym: (word: string) => ["synonyms", word],
  dictionary: (word: string) => ["dictionary", word],
  metadata: (key: string) => ["metadata", key],
} as const;

// 辞書メタデータの型定義
export interface DictionaryMetadata {
  version: string;
  synonymCount: number;
  dictionaryWordCount: number;
  lastUpdated: string;
  buildSource: "sudachi" | "prebuilt";
}

/**
 * 同義語を取得する
 */
export async function getSynonym(word: string): Promise<string | null> {
  const kv = await getKvInstance();
  const result = await kv.get<string>(KV_KEYS.synonym(word));
  return result.value;
}

/**
 * 単語が辞書に存在するかチェックする
 */
export async function wordExistsInDictionary(word: string): Promise<boolean> {
  const kv = await getKvInstance();
  const result = await kv.get<boolean>(KV_KEYS.dictionary(word));
  return result.value === true;
}

/**
 * 辞書メタデータを取得する
 */
export async function getDictionaryMetadata(): Promise<
  DictionaryMetadata | null
> {
  const kv = await getKvInstance();
  const result = await kv.get<DictionaryMetadata>(
    KV_KEYS.metadata("dictionary"),
  );
  return result.value;
}

/**
 * 辞書メタデータを設定する
 */
export async function setDictionaryMetadata(
  metadata: DictionaryMetadata,
): Promise<void> {
  const kv = await getKvInstance();
  await kv.set(KV_KEYS.metadata("dictionary"), metadata);
}

/**
 * 同義語マッピングをバッチで保存する
 */
export async function saveSynonymsBatch(
  synonymMap: Record<string, string>,
  dictionaryWords: string[],
  batchSize = 1000,
): Promise<void> {
  const kv = await getKvInstance();

  const allEntries = [
    // 同義語マッピング
    ...Object.entries(synonymMap).map(([word, replacement]) => ({
      key: KV_KEYS.synonym(word),
      value: replacement,
    })),
    // 辞書単語フラグ
    ...dictionaryWords.map((word) => ({
      key: KV_KEYS.dictionary(word),
      value: true,
    })),
  ];

  console.log(`📦 ${allEntries.length}件のデータをバッチ処理で保存中...`);

  // バッチサイズごとに分割して処理
  for (let i = 0; i < allEntries.length; i += batchSize) {
    const batch = allEntries.slice(i, i + batchSize);

    const atomic = kv.atomic();
    for (const entry of batch) {
      atomic.set(entry.key, entry.value);
    }

    const result = await atomic.commit();
    if (!result.ok) {
      throw new Error(
        `KVバッチ処理に失敗: batch ${Math.floor(i / batchSize) + 1}`,
      );
    }

    console.log(
      `✅ バッチ ${Math.floor(i / batchSize) + 1}/${
        Math.ceil(allEntries.length / batchSize)
      } 完了`,
    );
  }

  // メタデータを保存
  const metadata: DictionaryMetadata = {
    version: new Date().toISOString(),
    synonymCount: Object.keys(synonymMap).length,
    dictionaryWordCount: dictionaryWords.length,
    lastUpdated: new Date().toISOString(),
    buildSource: "sudachi",
  };

  await setDictionaryMetadata(metadata);
  console.log(
    `📊 メタデータ保存完了: ${metadata.synonymCount}個の同義語, ${metadata.dictionaryWordCount}個の辞書単語`,
  );
}

/**
 * 辞書が初期化済みかチェックする
 */
export async function isDictionaryInitialized(): Promise<boolean> {
  const metadata = await getDictionaryMetadata();
  return metadata !== null && metadata.synonymCount > 0;
}

/**
 * KV辞書の統計情報を取得する
 */
export async function getKvStats(): Promise<{
  synonymCount: number;
  dictionaryWordCount: number;
  lastUpdated: string | null;
}> {
  const kv = await getKvInstance();

  // メタデータから取得を試行
  const metadata = await getDictionaryMetadata();
  if (metadata) {
    return {
      synonymCount: metadata.synonymCount,
      dictionaryWordCount: metadata.dictionaryWordCount,
      lastUpdated: metadata.lastUpdated,
    };
  }

  // フォールバック: 実際にカウント（重い処理）
  let synonymCount = 0;
  let dictionaryWordCount = 0;

  const synonymsIter = kv.list({ prefix: ["synonyms"] });
  for await (const _entry of synonymsIter) {
    synonymCount++;
  }

  const dictIter = kv.list({ prefix: ["dictionary"] });
  for await (const _entry of dictIter) {
    dictionaryWordCount++;
  }

  return {
    synonymCount,
    dictionaryWordCount,
    lastUpdated: null,
  };
}

/**
 * KV辞書をクリアする（デバッグ用）
 */
export async function clearKvDictionary(): Promise<void> {
  const kv = await getKvInstance();

  // 同義語データを削除
  const synonymsIter = kv.list({ prefix: ["synonyms"] });
  const atomic1 = kv.atomic();
  for await (const entry of synonymsIter) {
    atomic1.delete(entry.key);
  }
  await atomic1.commit();

  // 辞書データを削除
  const dictIter = kv.list({ prefix: ["dictionary"] });
  const atomic2 = kv.atomic();
  for await (const entry of dictIter) {
    atomic2.delete(entry.key);
  }
  await atomic2.commit();

  // メタデータを削除
  await kv.delete(KV_KEYS.metadata("dictionary"));

  console.log("🗑️ KV辞書をクリアしました");
}

'use client'

import React, { useEffect, useState } from 'react';

import { useDropzone } from 'react-dropzone';

import { PDFDocument } from 'pdf-lib';

import { useAuth } from '@/lib/AuthContext';



// pdfjs を動的 import

const usePDFJS = () => {

  const [lib, setLib] = useState<any | null>(null)

  useEffect(() => {

    let cancelled = false

    ;(async () => {

      try {

        const pdfjsLib = await import('pdfjs-dist')

        const v = (pdfjsLib as any).version || '4.10.38'

        ;(pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${v}/build/pdf.worker.min.mjs`

        if (!cancelled) setLib(pdfjsLib)

      } catch (e) {

        if (!cancelled) setLib(null)

      }

    })()

    return () => { cancelled = true }

  }, [])

  return lib

}



type CompressionLevel = 'low' | 'medium' | 'high';

type ProcessMode = 'rasterize' | 'optimize';



const PDFCompressor: React.FC = () => {

  const { isLoggedIn } = useAuth();

  const pdfjsLib = usePDFJS()

  

  // State

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  const [progress, setProgress] = useState(0);

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const [downloadFileName, setDownloadFileName] = useState<string>('');

  

  // 設定

  const [processMode, setProcessMode] = useState<ProcessMode>('rasterize');

  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');

  const [dpi, setDpi] = useState<number>(144)

  const [quality, setQuality] = useState<number>(0.6)

  const [grayscale, setGrayscale] = useState<boolean>(false)

  

  const [originalSize, setOriginalSize] = useState<number>(0);

  const [compressedSize, setCompressedSize] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);



  // DPIの説明文を取得するヘルパー

  const getDpiDescription = (val: number) => {

    if (val <= 96) return 'モニタ閲覧用。ファイルサイズを最小限に抑えます。';

    if (val <= 144) return 'PCやタブレットでの閲覧に適したバランスの良い設定です。';

    return '印刷に耐えうる画質ですが、ファイルサイズは大きくなります。';

  };



  // ファイル選択時の処理

  const onDrop = (acceptedFiles: File[]) => {

    if (!isLoggedIn) {

      alert('入力するには会員登録（無料）が必要です。');

      return;

    }

    const file = acceptedFiles[0];

    if (!file || !file.type.includes('pdf')) {

      alert('PDFファイルのみ対応しています。');

      return;

    }

    // 状態リセット

    setSelectedFile(file);

    setOriginalSize(file.size);

    setCompressedSize(0);

    setDownloadUrl(null);

    setError(null);

    setProgress(0);

  };



  // 圧縮実行処理

  const startCompression = async () => {

    if (!selectedFile) return;



    setIsProcessing(true);

    setProgress(0);

    setError(null);

    setCompressedSize(0);

    setDownloadUrl(null);



    try {

      const arrayBuf = await selectedFile.arrayBuffer();



      if (processMode === 'optimize') {

        // --- テキスト維持モード ---

        const srcPdf = await PDFDocument.load(arrayBuf);

        const outPdf = await PDFDocument.create();

        const indices = srcPdf.getPageIndices();

        const copiedPages = await outPdf.copyPages(srcPdf, indices);

        copiedPages.forEach(page => outPdf.addPage(page));

        

        outPdf.setTitle(selectedFile.name);

        outPdf.setCreator('Yaneyuka Tool');



        const outBytes = await outPdf.save({ useObjectStreams: true });

        prepareDownload(outBytes, selectedFile.name, 'optimized');



      } else {

        // --- 画像化圧縮モード ---

        if (!pdfjsLib) { throw new Error('PDFエンジン初期化中です。'); }



        const preset = compressionLevel === 'high' ? { q: 0.4, dpi: 120 } : compressionLevel === 'low' ? { q: 0.8, dpi: 200 } : { q: 0.6, dpi: 144 }

        const targetQuality = quality

        const targetDpi = dpi



        const loadingTask = pdfjsLib.getDocument({ data: arrayBuf })

        const pdf = await loadingTask.promise

        const pageCount = pdf.numPages

        const outPdf = await PDFDocument.create()



        for (let i = 1; i <= pageCount; i++) {

          setProgress(Math.round((i - 1) / pageCount * 100))

          const page = await pdf.getPage(i)

          const viewport = page.getViewport({ scale: targetDpi / 72 })

          const canvas = document.createElement('canvas')

          const ctx = canvas.getContext('2d')!

          canvas.width = Math.max(1, Math.floor(viewport.width))

          canvas.height = Math.max(1, Math.floor(viewport.height))

          

          await page.render({ canvasContext: ctx as any, viewport }).promise



          if (grayscale) {

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)

            const data = imgData.data

            for (let p = 0; p < data.length; p += 4) {

              const y = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]

              data[p] = data[p + 1] = data[p + 2] = y

            }

            ctx.putImageData(imgData, 0, 0)

          }



          const jpegBlob: Blob = await new Promise((resolve, reject) => canvas.toBlob(b => {
            if (!b) { reject(new Error('画像の変換に失敗しました')); return; }
            resolve(b);
          }, 'image/jpeg', Math.min(1, Math.max(0.1, targetQuality))))

          const jpegBuf = await jpegBlob.arrayBuffer()

          const jpg = await outPdf.embedJpg(jpegBuf)

          const pageOut = outPdf.addPage([jpg.width, jpg.height])

          pageOut.drawImage(jpg, { x: 0, y: 0, width: jpg.width, height: jpg.height })

        }

        

        const outBytes = await outPdf.save({ useObjectStreams: true })

        prepareDownload(outBytes, selectedFile.name, 'compressed');

      }



    } catch (err) {

      console.error('PDF処理エラー:', err);

      setError(err instanceof Error ? err.message : '処理に失敗しました');

    } finally {

      setIsProcessing(false);

      setProgress(100);

    }

  };



  const prepareDownload = (data: Uint8Array, fileName: string, prefix: string) => {

    const outBlob = new Blob([data], { type: 'application/pdf' })

    setCompressedSize(outBlob.size)

    const url = URL.createObjectURL(outBlob)

    setDownloadUrl(url)

    setDownloadFileName(`${prefix}_${fileName}`)

  };



  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({

    onDrop,

    accept: { 'application/pdf': ['.pdf'] },

    multiple: false,

    noClick: true // クリックはボタンに任せる

  });



  const formatFileSize = (bytes: number): string => {

    if (bytes === 0) return '0 B';

    const k = 1024;

    const sizes = ['B', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;

  };



  // プリセット連動

  useEffect(() => {

    if (compressionLevel === 'high') { setDpi(96); setQuality(0.4); }

    else if (compressionLevel === 'medium') { setDpi(144); setQuality(0.6); }

    else if (compressionLevel === 'low') { setDpi(200); setQuality(0.8); }

  }, [compressionLevel]);



  return (

    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">

      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
        <h3 className="text-[13px] font-medium">PDF圧縮</h3>
        <p className="text-[11px] mt-0.5">PDFファイルのサイズを圧縮。用途に応じて高品質・標準・低サイズの3モードから選択可能</p>
        </div>
      </div>

      

      <div className="p-4">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          

          {/* --- 左カラム：入力・設定 --- */}

          <div className="space-y-6">

            

            {/* 1. ファイル選択エリア */}

            <div>

              <div

                {...getRootProps()}

                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors

                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}

              >

                <input {...getInputProps()} />

                <div className="flex flex-col items-center justify-center gap-2">

                  {selectedFile ? (

                    <>

                      <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>

                      <p className="text-[12px] font-bold text-gray-700">{selectedFile.name}</p>

                      <p className="text-[11px] text-gray-500">{formatFileSize(selectedFile.size)}</p>

                      <button 

                        onClick={(e) => { e.stopPropagation(); open(); }}

                        className="mt-2 text-[11px] text-blue-600 hover:underline"

                      >

                        別のファイルを選択

                      </button>

                    </>

                  ) : (

                    <>

                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>

                      <p className="text-[12px] text-gray-600">PDFファイルをドラッグ＆ドロップ</p>

                      <button 

                        onClick={(e) => { e.stopPropagation(); if (isLoggedIn) open(); else alert('ログインが必要です'); }}

                        className="mt-2 bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-[11px] hover:bg-gray-300"

                      >

                        ファイルを選択

                      </button>

                    </>

                  )}

                </div>

              </div>

            </div>



            {/* 2. 設定エリア */}

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">

              <label className="block text-[12px] font-bold mb-3 text-gray-700 border-b border-gray-200 pb-1">圧縮設定</label>

              

              {/* モード選択 */}

              <div className="flex gap-4 mb-4">

                <label className="flex items-center gap-2 cursor-pointer">

                  <input type="radio" name="mode" value="rasterize" checked={processMode === 'rasterize'} onChange={() => setProcessMode('rasterize')} />

                  <span className="text-[12px] font-medium">強力圧縮 (画像化)</span>

                </label>

                <label className="flex items-center gap-2 cursor-pointer">

                  <input type="radio" name="mode" value="optimize" checked={processMode === 'optimize'} onChange={() => setProcessMode('optimize')} />

                  <span className="text-[12px] font-medium">軽量化 (テキスト維持)</span>

                </label>

              </div>



              {processMode === 'rasterize' && (

                <div className="space-y-4 animate-fadeIn">

                  <div className="grid grid-cols-2 gap-3">

                    <div>

                      <label className="block text-[11px] font-medium mb-1 text-gray-600">プリセット</label>

                      <select

                        value={compressionLevel}

                        onChange={(e) => setCompressionLevel(e.target.value as CompressionLevel)}

                        className="w-full p-1.5 border rounded text-[11px] border-gray-300 bg-white"

                      >

                        <option value="low">低圧縮 (高品質)</option>

                        <option value="medium">標準</option>

                        <option value="high">高圧縮 (低品質)</option>

                      </select>

                    </div>

                    {/* DPI説明を追加 */}

                    <div>

                      <label className="block text-[11px] font-medium mb-1 text-gray-600">解像度 (DPI)</label>

                      <select value={dpi} onChange={(e)=> setDpi(Number(e.target.value))} className="w-full p-1.5 border rounded text-[11px] border-gray-300 bg-white">

                        <option value={96}>96 dpi</option>

                        <option value={144}>144 dpi</option>

                        <option value={200}>200 dpi</option>

                      </select>

                      <p className="text-[9px] text-gray-500 mt-1 leading-tight">

                        {getDpiDescription(dpi)}

                      </p>

                    </div>

                  </div>



                  <div>

                    <div className="flex justify-between items-end mb-1">

                      <label className="block text-[11px] font-medium text-gray-600">JPEG画質</label>

                      <span className="text-[11px] font-mono text-blue-600">{Math.round(quality*100)}%</span>

                    </div>

                    {/* 10%刻みに変更 */}

                    <input 

                      type="range" min={0.1} max={1} step={0.1} 

                      value={quality} 

                      onChange={(e)=> setQuality(Number(e.target.value))} 

                      className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600" 

                    />

                    <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">

                      <span>低画質(小)</span>

                      <span>高画質(大)</span>

                    </div>

                  </div>



                  <div className="flex items-center justify-between border-t border-gray-200 pt-3">

                    <label className="inline-flex items-center text-[11px] gap-2 cursor-pointer">

                      <input type="checkbox" checked={grayscale} onChange={(e)=> setGrayscale(e.target.checked)} className="rounded text-blue-600" />

                      モノクロ化してさらに圧縮

                    </label>

                  </div>



                  {compressionLevel === 'high' && (

                    <p className="text-[10px] text-orange-600 bg-orange-50 p-2 rounded border border-orange-100 mt-2">

                      ⚠️ 高圧縮は画質が低下し、細かい文字や図面が潰れる可能性があります。

                    </p>

                  )}

                </div>

              )}

              

              {processMode === 'optimize' && (

                <p className="text-[11px] text-gray-500 bg-white p-2 rounded border border-gray-200">

                  不要なメタデータや未使用オブジェクトを削除します。画質は劣化しませんが、圧縮率は限定的です。

                </p>

              )}

            </div>



            {/* 3. アクションボタン */}

            <button

              onClick={startCompression}

              disabled={!selectedFile || isProcessing || (!pdfjsLib && processMode === 'rasterize')}

              className={`w-full py-3 rounded-lg text-sm font-bold shadow-sm transition-all

                ${!selectedFile || isProcessing 

                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 

                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'}`}

            >

              {isProcessing ? '処理中...' : '圧縮を開始する'}

            </button>

            {!pdfjsLib && processMode === 'rasterize' && <p className="text-[10px] text-center text-blue-500 mt-1">エンジン準備中...</p>}



          </div>



          {/* --- 右カラム：結果・出力 --- */}

          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col h-full min-h-[300px]">

            <label className="block text-[12px] font-bold mb-3 text-gray-700 border-b border-gray-200 pb-1">処理結果</label>

            

            {/* 初期状態 / 処理中 */}

            {!downloadUrl && !isProcessing && (

              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">

                <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>

                <p className="text-[11px]">圧縮を開始するとここに結果が表示されます</p>

              </div>

            )}



            {isProcessing && (

              <div className="flex-1 flex flex-col items-center justify-center">

                <div className="w-full max-w-[200px] bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">

                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>

                </div>

                <p className="text-[12px] font-medium text-gray-600">処理中... {progress}%</p>

                <p className="text-[10px] text-gray-400 mt-1">ページ数が多い場合は時間がかかります</p>

              </div>

            )}



            {/* 完了後 */}

            {downloadUrl && (

              <div className="flex-1 flex flex-col animate-fadeIn">

                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4">

                  <div className="flex justify-between items-center mb-4">

                    <span className="text-[11px] font-bold text-gray-500">圧縮結果</span>

                    {compressedSize < originalSize ? (

                      <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">成功</span>

                    ) : (

                      <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">サイズ増</span>

                    )}

                  </div>

                  

                  <div className="flex items-center justify-between mb-2">

                    <span className="text-[11px] text-gray-600">元のサイズ</span>

                    <span className="text-[12px] font-mono">{formatFileSize(originalSize)}</span>

                  </div>

                  

                  <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">

                    <span className="text-[11px] text-gray-600">圧縮後</span>

                    <span className="text-[16px] font-bold text-blue-700 font-mono">{formatFileSize(compressedSize)}</span>

                  </div>



                  <div className="text-right">

                    <span className={`text-[12px] font-medium ${compressedSize < originalSize ? 'text-green-600' : 'text-red-500'}`}>

                      {compressedSize < originalSize 

                        ? `▼ ${((1 - compressedSize / originalSize) * 100).toFixed(1)}% 削減` 

                        : `▲ ${((compressedSize / originalSize - 1) * 100).toFixed(1)}% 増加`}

                    </span>

                  </div>

                </div>



                <div className="mt-auto">

                  {compressedSize >= originalSize && processMode === 'optimize' && (

                    <p className="text-[10px] text-gray-500 mb-3 bg-white p-2 rounded border border-gray-200">

                      既に最適化されているためサイズが減りませんでした。「強力圧縮（画像化）」を試してみてください。

                    </p>

                  )}

                  

                  <a

                    href={downloadUrl}

                    download={downloadFileName}

                    className="block w-full text-center bg-green-600 text-white font-bold py-3 rounded-lg shadow-sm hover:bg-green-700 hover:shadow-md transition-all text-sm"

                  >

                    ダウンロード

                  </a>

                </div>

              </div>

            )}



            {error && (

              <div className="p-3 bg-red-50 border border-red-200 rounded text-[11px] text-red-600 mt-2">

                エラー: {error}

              </div>

            )}

          </div>



        </div>

      </div>

    </div>

  );

};



export default PDFCompressor;

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageEditorProps {
  onImageReady: (base64: string) => void;
  onCancel: () => void;
}

export function ImageEditor({ onImageReady, onCancel }: ImageEditorProps) {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const getCroppedImg = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
      return;
    }

    const canvas = document.createElement('canvas');
    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return canvas.toDataURL('image/jpeg', 0.9);
  }, [completedCrop]);

  const handleSave = () => {
    if (completedCrop) {
      const croppedImage = getCroppedImg();
      if (croppedImage) {
        onImageReady(croppedImage);
      }
    } else if (imgSrc) {
      // Se não houve crop, usa a imagem original
      onImageReady(imgSrc);
    }
  };

  const handleRotate = () => {
    if (!imgRef.current) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = imgRef.current;
    canvas.width = image.naturalHeight;
    canvas.height = image.naturalWidth;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

    const rotatedImage = canvas.toDataURL('image/jpeg', 0.9);
    setImgSrc(rotatedImage);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const handleReset = () => {
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload */}
      {!imgSrc && (
        <div>
          <label className="block font-semibold mb-2">📷 Selecionar Foto</label>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onSelectFile}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition"
          />
        </div>
      )}

      {/* Editor */}
      {imgSrc && (
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded-lg">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={undefined}
            >
              <img
                ref={imgRef}
                src={imgSrc}
                alt="Imagem para recorte"
                className="max-w-full h-auto"
                style={{ maxHeight: '500px' }}
              />
            </ReactCrop>
          </div>

          {/* Controles */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleRotate}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
            >
              🔄 Girar 90°
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
            >
              🔄 Trocar Foto
            </button>
            <button
              onClick={() => {
                setCrop(undefined);
                setCompletedCrop(undefined);
              }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
            >
              ✂️ Limpar Recorte
            </button>
          </div>

          {/* Ações */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-semibold transition"
            >
              ✓ Usar Esta Imagem
            </button>
            <button
              onClick={onCancel}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-lg font-semibold transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

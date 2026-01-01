import { useCallback } from 'react';

interface FileUploadProps {
  label: string;
  accept: string;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

export function FileUpload({ label, accept, onFileSelect, selectedFile }: FileUploadProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  return (
    <div className="file-upload">
      <label className="file-upload-label">
        <span className="file-upload-text">{label}</span>
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="file-upload-input"
        />
        <span className="file-upload-button">
          {selectedFile ? selectedFile.name : 'Choose File'}
        </span>
      </label>
    </div>
  );
}

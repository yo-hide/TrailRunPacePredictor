import React from 'react';

interface Props {
    onUpload: (content: string) => void;
}

export const Uploader: React.FC<Props> = ({ onUpload }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            onUpload(text);
        };
        reader.readAsText(file);
    };

    return (
        <div style={{ border: '2px dashed #ccc', padding: '40px', textAlign: 'center', marginBottom: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <p style={{ marginBottom: '10px' }}>GPXファイルをアップロードしてください</p>
            <input type="file" accept=".gpx" onChange={handleChange} />
        </div>
    );
};

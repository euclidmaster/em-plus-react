import { useState, useRef } from 'react';
import { uploadAttachment } from '../../lib/api.js';

const TYPES = [
  { key: 'url',   icon: 'fa-link',       label: 'URL' },
  { key: 'image', icon: 'fa-image',      label: '사진' },
  { key: 'file',  icon: 'fa-paperclip',  label: '파일' },
];

function detectType(url) {
  if (!url) return 'url';
  const lower = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|heic|svg)(\?|$)/.test(lower)) return 'image';
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|hwp)(\?|$)/.test(lower)) return 'file';
  return 'url';
}

export default function AttachmentInput({ value, onChange }) {
  const [type, setType]       = useState(() => detectType(value));
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState('');
  const fileRef               = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const url = await uploadAttachment(file);
      onChange(url);
    } catch (err) {
      setError('업로드 실패: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function switchType(t) {
    setType(t);
    setError('');
    if (t !== detectType(value)) onChange('');
  }

  const isImage = type === 'image';
  const isFile  = type === 'file';
  const isUrl   = type === 'url';

  return (
    <div>
      {/* 타입 선택 탭 */}
      <div style={{ display:'flex', gap:6, marginBottom:10 }}>
        {TYPES.map(({ key, icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => switchType(key)}
            style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600,
              cursor:'pointer', transition:'all 0.15s',
              border:'1.5px solid ' + (type === key ? '#4361ee' : '#e2e8f0'),
              background: type === key ? '#4361ee' : '#fff',
              color: type === key ? '#fff' : '#475569',
            }}
          >
            <i className={`fas ${icon}`}></i> {label}
          </button>
        ))}
      </div>

      {/* URL 입력 */}
      {isUrl && (
        <input
          type="url"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="https://..."
          style={inp}
        />
      )}

      {/* 사진 업로드 */}
      {isImage && (
        <div>
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            style={{
              border:'2px dashed ' + (uploading ? '#c7d2fe' : '#e2e8f0'),
              borderRadius:10, padding:'20px 16px',
              textAlign:'center', cursor: uploading ? 'wait' : 'pointer',
              background: uploading ? '#f8f8ff' : '#fafafa',
              transition:'all 0.15s',
            }}
          >
            {value
              ? <img src={value} alt="미리보기"
                  style={{ maxWidth:'100%', maxHeight:160, borderRadius:8, objectFit:'contain' }}
                  onError={() => onChange('')}
                />
              : <div style={{ color:'#94a3b8' }}>
                  <i className="fas fa-cloud-upload-alt" style={{ fontSize:28, marginBottom:8, display:'block' }}></i>
                  <div style={{ fontSize:13, fontWeight:600 }}>
                    {uploading ? '업로드 중...' : '클릭하여 사진 선택'}
                  </div>
                  <div style={{ fontSize:11, marginTop:4 }}>JPG, PNG, GIF, WEBP</div>
                </div>
            }
          </div>
          {value && (
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button type="button" onClick={() => fileRef.current?.click()}
                style={{ ...smBtn, borderColor:'#c7d2fe', color:'#4361ee' }}>
                <i className="fas fa-sync-alt"></i> 다시 선택
              </button>
              <button type="button" onClick={() => onChange('')}
                style={{ ...smBtn, borderColor:'#fca5a5', color:'#dc2626' }}>
                <i className="fas fa-times"></i> 삭제
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile}
            style={{ display:'none' }} />
        </div>
      )}

      {/* 파일 업로드 */}
      {isFile && (
        <div>
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            style={{
              border:'2px dashed ' + (uploading ? '#c7d2fe' : '#e2e8f0'),
              borderRadius:10, padding:'16px',
              display:'flex', alignItems:'center', gap:12,
              cursor: uploading ? 'wait' : 'pointer',
              background: uploading ? '#f8f8ff' : '#fafafa',
              transition:'all 0.15s',
            }}
          >
            <div style={{
              width:40, height:40, borderRadius:10, background:'#eef2ff',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#4361ee', fontSize:16, flexShrink:0,
            }}>
              <i className={`fas ${uploading ? 'fa-spinner fa-spin' : value ? 'fa-file-alt' : 'fa-upload'}`}></i>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              {value
                ? <div style={{ fontSize:13, fontWeight:600, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {decodeURIComponent(value.split('/').pop().replace(/_[a-z0-9]+\.(\w+)$/, '.$1'))}
                  </div>
                : <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#475569' }}>
                      {uploading ? '업로드 중...' : '클릭하여 파일 선택'}
                    </div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>PDF, Word, Excel, HWP, ZIP 등</div>
                  </div>
              }
            </div>
          </div>
          {value && (
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <a href={value} target="_blank" rel="noreferrer"
                style={{ ...smBtn, borderColor:'#c7d2fe', color:'#4361ee', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
                <i className="fas fa-external-link-alt"></i> 열기
              </a>
              <button type="button" onClick={() => fileRef.current?.click()}
                style={{ ...smBtn, borderColor:'#e2e8f0', color:'#475569' }}>
                <i className="fas fa-sync-alt"></i> 다시 선택
              </button>
              <button type="button" onClick={() => onChange('')}
                style={{ ...smBtn, borderColor:'#fca5a5', color:'#dc2626' }}>
                <i className="fas fa-times"></i> 삭제
              </button>
            </div>
          )}
          <input ref={fileRef} type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.hwp,image/*"
            onChange={handleFile} style={{ display:'none' }} />
        </div>
      )}

      {error && (
        <div style={{ marginTop:6, fontSize:12, color:'#ef4444' }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight:4 }}></i>{error}
        </div>
      )}
    </div>
  );
}

const inp   = { width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, boxSizing:'border-box', fontFamily:'inherit' };
const smBtn = { padding:'5px 12px', border:'1.5px solid', borderRadius:7, background:'#fff', cursor:'pointer', fontSize:12, fontWeight:600 };

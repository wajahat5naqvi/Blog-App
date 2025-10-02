import React, { useRef, forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Define the QuillEditor props type
interface QuillEditorProps {
  value: string;
  onChange: (content: string) => void;
  theme?: string;
  modules?: any;
  formats?: string[];
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * QuillEditor component - A wrapper around ReactQuill that avoids React 18 findDOMNode deprecation issues
 * This component uses a patched approach that doesn't rely on findDOMNode
 */
const QuillEditor = forwardRef<ReactQuill, QuillEditorProps>(
  ({ value, onChange, theme = 'snow', modules, formats, placeholder, readOnly, className, style }, ref) => {
    // Create a ref for the wrapper div
    const wrapperRef = useRef<HTMLDivElement>(null);
    // Create a ref for the ReactQuill instance
    const quillRef = useRef<ReactQuill>(null);
    // State to control mounting of the editor (for SSR safety)
    const [isMounted, setIsMounted] = useState(false);
    
    // Effect to handle client-side mounting
    useEffect(() => {
      setIsMounted(true);
      
      // Apply a patch to ReactQuill prototype to avoid findDOMNode usage
      const ReactQuillPrototype = ReactQuill.prototype as any;
      if (ReactQuillPrototype && ReactQuillPrototype.getEditingArea && !ReactQuillPrototype._patched) {
        const originalGetEditingArea = ReactQuillPrototype.getEditingArea;
        ReactQuillPrototype.getEditingArea = function() {
          // Use the ref's current DOM node instead of findDOMNode
          return this.editingArea || null;
        };
        ReactQuillPrototype._patched = true;
      }
    }, []);
    
    // Forward the ref to parent components if needed
    useImperativeHandle(ref, () => quillRef.current as ReactQuill);
    
    // We need to use a stable reference to the onChange function
    // to avoid unnecessary re-renders
    const handleChange = (content: string) => {
      if (onChange) {
        onChange(content);
      }
    };

    // If not mounted yet (server-side rendering)
    if (!isMounted || typeof window === 'undefined') {
      return <div ref={wrapperRef} className={className || "quill-editor-loading"}>Loading editor...</div>;
    }

    return (
      <div className={className || "quill-editor-container"} style={style}>
        <ReactQuill
          ref={quillRef}
          theme={theme}
          value={value}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      </div>
    );
  }
);

QuillEditor.displayName = 'QuillEditor';

export default QuillEditor;
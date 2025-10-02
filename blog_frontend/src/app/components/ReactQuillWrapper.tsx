import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ReactQuillProps } from 'react-quill';

/**
 * ReactQuillWrapper - A wrapper component for ReactQuill that avoids using findDOMNode
 * which is deprecated in React 18
 */
const ReactQuillWrapper = forwardRef<ReactQuill, ReactQuillProps>((props, ref) => {
  const quillRef = useRef<ReactQuill>(null);

  // Forward ref methods to parent component if needed
  useImperativeHandle(ref, () => quillRef.current as ReactQuill);

  return (
    <div className="react-quill-wrapper">
      <ReactQuill
        ref={quillRef}
        {...props}
      />
    </div>
  );
});

ReactQuillWrapper.displayName = 'ReactQuillWrapper';

export default ReactQuillWrapper;
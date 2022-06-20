import React, { useCallback, useEffect, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";

const SAVE_INTERVAL_MS = 2000
const TOOLBAR_OPTIONS = [
  ["bold", "italic", "underline", "strike"], // toggled buttons
  ["image", "blockquote", "code-block"],

  [{ header: [1, 2, 3, 4, 5, 6, false] }], // custom button values
  [{ list: "ordered" }, { list: "bullet" }],
  [{ script: "sub" }, { script: "super" }], // superscript/subscript
  [{ indent: "-1" }, { indent: "+1" }], // outdent/indent                         // text direction
  [{ header: [1, 2, 3, 4, 5, 6, false] }],

  [{ color: [] }, { background: [] }], // dropdown with defaults from theme
  [{ font: [] }],
  [{ align: [] }],

  ["clean"], // remove formatting button
];

export default function TextEditor() {
    const {id: documentId} = useParams()
  const [socket, setSocket] = useState()
  const [quill, setQuill] = useState()

  useEffect(() => {
    //server URL on the client side
    const s = io("http://localhost:3001")
    setSocket(s)

    return () => {
      s.disconnect();
    }
  }, [])

  useEffect(() => {
    if(socket == null || quill == null) return

    //Once the server returns the document, display it and enable the editor
    socket.on('load-document', document =>{
        console.log(document)
        quill.setContents(document)
        quill.enable()
    })

    //tell the server that we want the document with particular documentId
    socket.emit('get-document', documentId)
    //console.log(documentId)
  }, [socket, quill, documentId])

  useEffect(() => {
    if(socket == null || quill == null) return

    const handler = (delta, oldDelta, source) => {
        //only track the changes the user makes on his document
        if(source !== 'user') return

        //emit the changes made to the document
        socket.emit('send-changes', delta)
    }

    //whenever quill has any changes send it to the server using the above handler
    quill.on('text-change', handler)
  
    return () => {
        quill.off('text-change', handler)
    }
  }, [socket, quill])

  useEffect(() => {
    if(socket == null || quill == null) return

    //this handler updates the contents of our editor
    const handler = (delta) => {
        quill.updateContents(delta)
    }

    //fire the handler when we get the receive-changes broadcast
    socket.on('receive-changes', handler)
  
    return () => {
        socket.off('receive-changes', handler)
    }
  }, [socket, quill])

  useEffect(() => {
    if(socket == null || quill == null) return

   const interval = setInterval(() =>{
        socket.emit('save-document', quill.getContents())
   }, SAVE_INTERVAL_MS)
  
    return () => {
        clearInterval(interval)
    }
  }, [socket, quill])
  

  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;
    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);
    const q = new Quill(editor, {
      theme: "snow",
      modules: {
        toolbar: TOOLBAR_OPTIONS,
      },
    })
    //disable the editor while loading the document from the server
    q.disable()
    q.setText('Loading...')
    setQuill(q)
  }, [])
  return <div className="container" ref={wrapperRef}></div>
}

//Notes:
// I like to think of refs very similarly to state, since they persist between renders, but refs do not cause a component to re-render when changed.

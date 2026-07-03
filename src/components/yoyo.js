/* eslint-disable react/prop-types */

import {createRef, useEffect, useRef} from "react";
import Note from "./note";

const Notes = ({notes = [], setNotes = () => {}}) => {


  const handleDragStart = (note, e) => {
    const {id} = note;
    const noteRef = noteRefs.current[id].current;
    const rect = noteRef.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const handleMouseMove = (e) => {
      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;

      noteRef.style.left = `${newX}px`;
      noteRef.style.top = `${newY}px`;
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      const finalRect = noteRef.getBoundingClientRect();
      const newPosition = {x: finalRect.left, y: finalRect.top};

        updateNotePosition(id, newPosition);
      
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };


  const updateNotePosition = (id, newPosition) => {
    const updatedNotes = notes.map((note) =>
      note.id === id ? {...note, position: newPosition} : note
    );
    setNotes(updatedNotes);
  };

  return (
    <div>
      {notes.map((note) => {
        return (
          <Note
            key={note.id}
           
          />
        );
      })}
    </div>
  );
};

export default Notes;
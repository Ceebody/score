// src/pages/teacher/SBAFormWrapper.js
import React from "react";
import { useParams } from "react-router-dom";
import SBAForm from "./SBAForm";

export default function SBAFormWrapper() {
  const { classId, studentId, subject } = useParams();

  return (
    <SBAForm
      classId={classId}
      studentId={studentId}
      subject={subject}
    />
  );
}

// ParentProfile.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, get, update, remove } from "firebase/database";
import { db } from "../utils/firebase";
import BackButton from "../components/BackButton";
import ProfileEditor from "../components/ProfileEditor";


export default function ParentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchParent = async () => {
      try {
        const parentRef = ref(db, `parents/${id}`);
        const snapshot = await get(parentRef);
        if (snapshot.exists()) {
          setParent(snapshot.val());
          setFormData(snapshot.val());
        } else {
          console.log("No parent data found");
        }
      } catch (err) {
        console.error("Error fetching parent:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchParent();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function saveProfile(data) {
    try {
      await update(ref(db, `parents/${id}`), data);
      setParent(data);
      setFormData(data);
      setEditing(false);
    } catch (err) {
      console.error("Error updating parent:", err);
      throw err;
    }
  }

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this parent?")) {
      try {
        await remove(ref(db, `parents/${id}`));
        navigate("/parents");
      } catch (err) {
        console.error("Error deleting parent:", err);
      }
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!parent) return <p>Parent not found</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Parent Profile</h2>
            <BackButton /> {/* ✅ added */}
      

      {editing ? (
        <ProfileEditor
          initialData={formData}
          onSave={saveProfile}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="space-y-2">
          <p><strong>ID:</strong> {id}</p>
          <p><strong>Name:</strong> {parent.name}</p>
          <p><strong>Phone:</strong> {parent.phone}</p>
          <p><strong>Email:</strong> {parent.email}</p>

          <button
            onClick={() => setEditing(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Delete
          </button>
        </div>
      )}

      <button
        onClick={() => navigate("/parents")}
        className="mt-4 bg-gray-300 px-4 py-2 rounded"
      >
        Back to Parents
      </button>
    </div>
  );
}

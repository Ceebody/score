import React from "react";

export default function EntityListPrint({ title, columns, data }) {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4 text-center">{title}</h1>
            <table className="w-full border-collapse">
                <thead className="bg-gray-200">
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} className="border p-2 text-left">
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, idx) => (
                        <tr key={idx} className="border-b">
                            {columns.map((col) => (
                                <td key={col.key} className="border p-2">
                                    {row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function Instructions() {
  const sections = [
    {
      title: "Earthquake Protocol",
      content: "Drop, Cover, and Hold On. Stay away from glass, windows, outside doors and walls. Do not use elevators."
    },
    {
      title: "Mesh Network Tips",
      content: "Keep your phone's Bluetooth and Wi-Fi enabled even if there is no internet. The mesh operates using these radios."
    },
    {
      title: "First Aid Basics",
      content: "Apply direct pressure to bleeding wounds. Do not move persons with suspected spinal injuries unless in immediate danger."
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Emergency Instructions</h2>
      <p className="text-sm text-gray-500">These guides are stored offline and are always accessible.</p>

      <div className="space-y-4">
        {sections.map((sec, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-blue-900 mb-2">{sec.title}</h3>
            <p className="text-gray-700 text-sm">{sec.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

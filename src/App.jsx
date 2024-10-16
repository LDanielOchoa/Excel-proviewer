import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx'; // Importar SheetJS

function App() {
  const [file, setFile] = useState(null);
  const [isExcel, setIsExcel] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [dataPreview, setDataPreview] = useState([]); // Para almacenar la vista previa de los datos
  const fileInputRef = useRef(null);

  const onDrop = useCallback((acceptedFiles) => {
    handleFile(acceptedFiles[0]);
  }, []);

  const handleFile = (selectedFile) => {
    if (selectedFile) {
      setFile(selectedFile);
      const isExcelFile = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');
      setIsExcel(isExcelFile);

      if (isExcelFile) {
        setShowDateModal(true);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    noClick: true,
  });

  const resetFile = () => {
    setFile(null);
    setIsExcel(null);
    setStartDate('');
    setEndDate('');
    setDownloadUrl('');
    setShowDateModal(false);
    setErrorMessage(''); // Reset error message when resetting the file
    setDataPreview([]); // Reinicia la vista previa de los datos
  };

  const handleSaveDates = async () => {
    if (!file || !startDate || !endDate) {
      setErrorMessage('Por favor, selecciona un archivo y proporciona las fechas.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('start_date', startDate);
    formData.append('end_date', endDate);

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/upload/', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        const result = await response.json();
        if (result.error) {
          setErrorMessage(result.error);
          setShowDateModal(false);
          return;
        }
        throw new Error(`Error al enviar las fechas: ${response.statusText}`);
      }

      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (result.error) {
          setErrorMessage(result.error);
          setShowDateModal(false);
          return;
        }
        // Suponiendo que el backend retorna los datos procesados en formato JSON
        if (result.data) {
          setDataPreview(result.data); // Establece la vista previa de los datos
        }
      } else if (contentType && contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
        const result = await response.blob();
        const url = window.URL.createObjectURL(result);
        setDownloadUrl(url);
      } else {
        throw new Error('Tipo de respuesta inesperado.');
      }
    } catch (error) {
      console.error('Error al enviar las fechas:', error);
      setErrorMessage('Error al procesar el archivo. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
      setShowDateModal(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-400 to-blue-500 p-4">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Bufalo</h1>

        <motion.div
          {...getRootProps()}
          onClick={() => fileInputRef.current.click()}
          className={`relative overflow-hidden rounded-xl border-4 border-dashed p-8 transition-colors ${
            isDragActive ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <input
            {...getInputProps()}
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files) {
                handleFile(e.target.files[0]);
              }
            }}
          />
          <AnimatePresence mode="wait">
            {file ? (
              <motion.div
                key="file-info"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center"
              >
                <motion.div
                  animate={isExcel ? { rotate: [0, 360] } : { x: [0, 10, -10, 0] }}
                  transition={isExcel ? { duration: 0.5 } : { duration: 0.5, repeat: Infinity }}
                >
                  {isExcel ? (
                    <CheckCircle className="mx-auto text-green-500" size={64} />
                  ) : (
                    <AlertCircle className="mx-auto text-red-500" size={64} />
                  )}
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 text-lg font-semibold ${isExcel ? 'text-green-600' : 'text-red-600'}`}
                >
                  {isExcel ? '¡Excel válido!' : 'Archivo no válido'}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-2 text-sm text-gray-500"
                >
                  {file.name}
                </motion.p>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetFile();
                  }}
                  className="mt-4 ml-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-full inline-flex items-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X size={16} className="mr-2" />
                  Reiniciar
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="upload-prompt"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <FileSpreadsheet className="mx-auto text-green-500" size={64} />
                </motion.div>
                <p className="mt-4 text-lg font-semibold text-gray-700">Arrastra tu archivo Excel aquí</p>
                <p className="mt-2 text-sm text-gray-500">o haz clic para seleccionar</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {showDateModal && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded-lg shadow-lg text-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Seleccionar Fechas</h2>
              <div className="flex flex-col space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-bold text-gray-700">Fecha de Inicio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-bold text-gray-700">Fecha de Fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="mt-4 space-x-2">
                <button
                  onClick={handleSaveDates}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setShowDateModal(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isLoading && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded-lg shadow-lg text-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Procesando...</h2>
              <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
            </motion.div>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Error</h2>
              <p className="text-red-500">{errorMessage}</p>
              <button
                onClick={() => setErrorMessage('')}
                className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        )}

        {downloadUrl && (
          <div className="mt-4">
            <a
              href={downloadUrl}
              download="archivo_procesado.xlsx"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full inline-block"
            >
              Descargar Archivo Procesado
            </a>
          </div>
        )}

        {/* Mostrar vista previa de los datos si está disponible */}
        {dataPreview.length > 0 && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold text-gray-800">Vista Previa de Datos</h2>
            <table className="min-w-full mt-2 border border-gray-300">
              <thead>
                <tr>
                  {Object.keys(dataPreview[0]).map((key) => (
                    <th key={key} className="border-b px-4 py-2 text-left text-gray-600">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataPreview.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-100">
                    {Object.values(row).map((value, idx) => (
                      <td key={idx} className="border-b px-4 py-2">{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default App;

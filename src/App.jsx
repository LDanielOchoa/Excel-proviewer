'use client'

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { FileSpreadsheet, AlertCircle, CheckCircle, X, Loader2, ChevronLeft, ChevronRight, Calendar, Upload } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { format, addMonths, subMonths, isWeekend, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-day-picker/dist/style.css'

const colombianHolidays = [
  new Date(2024, 0, 1), new Date(2024, 0, 8), new Date(2024, 2, 25), new Date(2024, 2, 28), new Date(2024, 2, 29),
  new Date(2024, 4, 1), new Date(2024, 5, 3), new Date(2024, 5, 24), new Date(2024, 6, 1), new Date(2024, 6, 20),
  new Date(2024, 7, 7), new Date(2024, 7, 19), new Date(2024, 9, 14), new Date(2024, 10, 4), new Date(2024, 10, 11),
  new Date(2024, 11, 8), new Date(2024, 11, 25)
]

export default function Component() {
  const [file, setFile] = useState(null)
  const [isExcel, setIsExcel] = useState(null)
  const [showDateModal, setShowDateModal] = useState(false)
  const [range, setRange] = useState({ from: undefined, to: undefined })
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [month, setMonth] = useState(new Date())
  const fileInputRef = useRef(null)

  const onDrop = useCallback((acceptedFiles) => {
    handleFile(acceptedFiles[0])
  }, [])

  const handleFile = (selectedFile) => {
    if (selectedFile) {
      setFile(selectedFile)
      const isExcelFile = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')
      setIsExcel(isExcelFile)
      if (isExcelFile) {
        setShowDateModal(true)
      }
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    noClick: true,
  })

  const resetFile = () => {
    setFile(null)
    setIsExcel(null)
    setRange({ from: undefined, to: undefined })
    setShowDateModal(false)
    setErrorMessage('')
  }

  const handleSaveDates = async () => {
    if (!file || !range.from || !range.to) {
      setErrorMessage('Por favor, selecciona un archivo y un rango de fechas.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('start_date', format(range.from, 'yyyy-MM-dd'))
    formData.append('end_date', format(range.to, 'yyyy-MM-dd'))

    setIsLoading(true)
    setErrorMessage('')
    try {
      const response = await fetch('https://excel-proviewer-production.up.railway.app/upload/', { 
        method: 'POST', 
        body: formData 
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Datos recibidos del servidor:', result)
        
        const byteCharacters = atob(result.excel_file)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
        
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = 'archivo_procesado.xlsx'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        
        alert('Archivo procesado con éxito. La descarga comenzará automáticamente.')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error en la respuesta del servidor')
      }
    } catch (error) {
      console.error('Error al procesar el archivo:', error)
      setErrorMessage(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
      setShowDateModal(false)
    }
  }

  const isHoliday = (date) => {
    return colombianHolidays.some(holiday => 
      holiday.getDate() === date.getDate() &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getFullYear() === date.getFullYear()
    )
  }

  return (
    <motion.div 
      className="w-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-400 to-emerald-600 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md"
      >
        <motion.h1 
          className="text-5xl font-bold text-center mb-8 text-emerald-700"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
        >
          Bufalo
        </motion.h1>

        <motion.div
          {...getRootProps()}
          onClick={() => fileInputRef.current?.click()}
          className={`relative overflow-hidden rounded-2xl p-8 transition-all duration-300 ${
            isDragActive ? 'bg-emerald-100' : 'bg-gray-50'
          } ${file ? 'border-4 border-emerald-500' : 'border-4 border-dashed border-gray-300'}`}
          whileHover={{ scale: 1.02, boxShadow: "0px 0px 20px rgba(16, 185, 129, 0.2)" }}
          whileTap={{ scale: 0.98 }}
        >
          <input
            {...getInputProps()}
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files) {
                handleFile(e.target.files[0])
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
                    <CheckCircle className="mx-auto text-emerald-500" size={64} />
                  ) : (
                    <AlertCircle className="mx-auto text-red-500" size={64} />
                  )}
                </motion.div>
                <motion.p
                  className={`mt-4 text-lg font-semibold ${isExcel ? 'text-emerald-600' : 'text-red-600'}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {isExcel ? '¡Excel válido!' : 'Archivo no válido'}
                </motion.p>
                <motion.p 
                  className="mt-2 text-sm text-gray-600"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {file.name}
                </motion.p>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    resetFile()
                  }}
                  className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full inline-flex items-center transition-all duration-300"
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
                  className="bg-emerald-500 rounded-full p-4 inline-block"
                  animate={{ y: [0, -10, 0] }} 
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                >
                  <Upload className="text-white" size={48} />
                </motion.div>
                <motion.p 
                  className="mt-4 text-lg font-semibold text-emerald-700"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Arrastra tu archivo Excel aquí
                </motion.p>
                <motion.p 
                  className="mt-2 text-sm text-gray-600"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  o haz clic para seleccionar
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {showDateModal && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="mt-6"
            >
              <motion.h2 
                className="text-2xl font-semibold text-emerald-700 mb-4 text-center"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                Selecciona el rango de fechas:
              </motion.h2>
              <div className="flex justify-center">
                <DayPicker
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  locale={es}
                  month={month}
                  onMonthChange={setMonth}
                  showOutsideDays
                  className="border rounded-lg shadow-lg p-4 bg-white"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center relative items-center",
                    caption_label: "text-sm font-medium text-gray-900",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-emerald-600 rounded-md w-9 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-emerald-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                    day_selected: "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-500 focus:text-white",
                    day_today: "bg-gray-100 text-emerald-500 font-bold",
                    day_outside: "text-gray-300 opacity-50",
                    day_disabled: "text-gray-300",
                    day_range_middle: "aria-selected:bg-emerald-100 aria-selected:text-emerald-700",
                    day_hidden: "invisible",
                  }}
                  components={{
                    IconLeft: () => <ChevronLeft className="h-4 w-4 text-emerald-600" />,
                    IconRight: () => <ChevronRight className="h-4 w-4 text-emerald-600" />,
                
                    DayContent: ({ date, ...props }) => {
                      const dayOfMonth = format(date, 'd')
                      const isSelected = range.from && range.to && (
                        isSameDay(date, range.from) || 
                        isSameDay(date, range.to) || 
                        (date > range.from && date < range.to)
                      )
                      return (
                        <motion.div
                          className={`flex items-center justify-center w-full h-full rounded-full transition-colors
                            ${isHoliday(date) ? 'bg-red-100 text-red-600' : ''}
                            ${isWeekend(date) ? 'text-emerald-600 font-semibold' : ''}
                            ${isSelected ? 'bg-emerald-500 text-white' : ''}
                            ${isSameDay(date, range.from) ? 'ring-2 ring-emerald-500' : ''}
                            ${isSameDay(date, range.to) ? 'ring-2 ring-emerald-500' : ''}
                          `}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          {...props}
                        >
                          {dayOfMonth}
                        </motion.div>
                      )
                    },
                  }}
                />
              </div>
              <div className="mt-4 text-center text-sm text-emerald-700">
                <p>Rango seleccionado:</p>
                <p className="font-semibold">
                  {range.from ? format(range.from, 'dd/MM/yyyy') : '___'} 
                  {' - '}
                  {range.to ? format(range.to, 'dd/MM/yyyy') : '___'}
                </p>
              </div>
              {errorMessage && (
                <motion.p 
                  className="text-red-500 mt-4 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {errorMessage}
                </motion.p>
              )}
              <motion.button
                onClick={handleSaveDates}
                className="mt-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-full w-full flex items-center justify-center transition-all duration-300"
                whileHover={{ scale: 1.05, boxShadow: "0px 0px 15px rgba(16, 185, 129, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading || !range.from || !range.to}
              >
                {isLoading ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="mr-2" />
                  </motion.span>
                ) : (
                  <Calendar className="mr-2" />
                )}
                {isLoading ? 'Procesando...' : 'Guardar y Enviar'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
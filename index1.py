from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import BytesIO
import openpyxl
import uvicorn

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def safe_to_datetime(series):
    """Convierte una serie a datetime, manejando errores y valores no válidos."""
    try:
        return pd.to_datetime(series, format='%d-%m-%y', errors='coerce')
    except Exception as e:
        print(f"Error convirtiendo a datetime: {e}")
        return pd.Series([pd.NaT] * len(series))

@app.post("/preview/")
async def preview_excel(file: UploadFile = File(...)):
    """Endpoint para previsualizar los datos del archivo Excel cargado."""
    try:
        contents = await file.read()
        excel_data = pd.ExcelFile(BytesIO(contents))

        # Validar si las hojas esperadas están presentes
        if 'Data Usuarios' not in excel_data.sheet_names or 'Data Kilometros' not in excel_data.sheet_names:
            return {"error": "Las hojas 'Data Usuarios' o 'Data Kilometros' no existen en el archivo."}, 400

        # Acceder a las hojas de datos
        df_usuarios = pd.read_excel(excel_data, sheet_name='Data Usuarios')
        df_kilometros = pd.read_excel(excel_data, sheet_name='Data Kilometros')

        # Validar si las columnas esperadas están presentes
        if df_usuarios.shape[1] < 2 or df_kilometros.shape[1] < 2:
            return {"error": "El archivo no contiene suficientes columnas en alguna de las hojas."}, 400

        # Convertir la columna de fechas a datetime
        df_usuarios.iloc[:, 1] = safe_to_datetime(df_usuarios.iloc[:, 1])
        df_kilometros.iloc[:, 1] = safe_to_datetime(df_kilometros.iloc[:, 1])

        # Devolver un resumen de los datos
        usuarios_preview = df_usuarios.head().to_dict(orient='records')  # Obtener un resumen de los primeros registros
        kilometros_preview = df_kilometros.head().to_dict(orient='records')

        return {
            "usuarios": usuarios_preview,
            "kilometros": kilometros_preview,
        }
    except Exception as e:
        print(f"Error en la previsualización del archivo: {e}")
        return {"error": str(e)}, 500

@app.post("/upload/")
async def upload_excel(
    file: UploadFile = File(...),
    start_date: str = Form(...),
    end_date: str = Form(...)
):
    try:
        # Leer el archivo Excel cargado
        contents = await file.read()
        excel_data = pd.ExcelFile(BytesIO(contents))

        # Acceder a la hoja "Data Usuarios" para los datos de usuarios
        df_usuarios = pd.read_excel(excel_data, sheet_name='Data Usuarios')

        # Acceder a la hoja "Data Kilometros" para los datos de kilómetros
        df_kilometros = pd.read_excel(excel_data, sheet_name='Data Kilometros')

        # Convertir la columna B a formato datetime para "Data Usuarios"
        df_usuarios.iloc[:, 1] = safe_to_datetime(df_usuarios.iloc[:, 1])

        # Convertir la columna B a formato datetime para "Data Kilometros"
        df_kilometros.iloc[:, 1] = safe_to_datetime(df_kilometros.iloc[:, 1])

        # Convertir las fechas de inicio y fin a formato datetime
        start_date_dt = pd.to_datetime(start_date, format='%Y-%m-%d')
        end_date_dt = pd.to_datetime(end_date, format='%Y-%m-%d')

        # Generar un rango de fechas
        date_range = pd.date_range(start=start_date_dt, end=end_date_dt)

        # Abrir la plantilla Excel
        plantilla = openpyxl.load_workbook('PlantillaPrimera.xlsx')  # Ruta a tu plantilla Excel

        # Asegúrate de que el rango de fechas no exceda las 7 hojas
        if len(date_range) > 7:
            return {"error": "El rango de fechas no puede exceder 7 días."}

        # Inicializar una lista para rastrear las hojas que tienen datos
        hojas_con_datos = []

        # Iterar sobre el rango de fechas y escribir en las hojas correspondientes
        for i, single_date in enumerate(date_range):
            # Acceder a la hoja correspondiente (Hoja1 a Hoja7)
            sheet_name = f"Hoja{i + 1}"  # Hoja1, Hoja2, ..., Hoja7
            sheet = plantilla[sheet_name]

            # Filtrar usuarios y kilómetros para la fecha actual
            mask_usuarios = (df_usuarios.iloc[:, 1] == single_date)
            filtered_usuarios = df_usuarios.loc[mask_usuarios]

            mask_kilometros = (df_kilometros.iloc[:, 1] == single_date)
            filtered_kilometros = df_kilometros.loc[mask_kilometros]

            # Escribir la fecha en la celda A1 (puedes cambiar la celda según tu necesidad)
            sheet['A1'] = single_date.strftime('%Y-%m-%d')

            # Si hay datos de usuarios, escribir en la hoja correspondiente
            if not filtered_usuarios.empty:
                # Dividir la suma por 2
                total_usuarios = filtered_usuarios.iloc[:, 7].sum() / 2
                sheet['B8'] = total_usuarios  # Colocar la suma en la celda
                hojas_con_datos.append(sheet_name)  # Añadir la hoja a la lista

            # Si hay datos de kilómetros, escribir en la hoja correspondiente
            if not filtered_kilometros.empty:
                # Dividir la suma por 2
                total_kilometros = filtered_kilometros.iloc[:, 7].sum() / 2
                sheet['B3'] = total_kilometros  # Colocar la suma en la celda
                hojas_con_datos.append(sheet_name)  # Añadir la hoja a la lista

        # Ocultar las hojas que no tienen datos
        for sheet_name in plantilla.sheetnames:
            if sheet_name not in hojas_con_datos:
                sheet = plantilla[sheet_name]
                sheet.sheet_state = 'hidden'  # Ocultar la hoja

        # Guardar el archivo modificado en un buffer en memoria
        buffer = BytesIO()
        plantilla.save(buffer)
        buffer.seek(0)  # Mover el puntero al inicio del buffer

        # Retornar el archivo Excel modificado como una respuesta de streaming
        return StreamingResponse(
            buffer,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={"Content-Disposition": "attachment; filename=resultado.xlsx"}
        )
    except Exception as e:
        print(f"Error procesando archivo: {e}")  # Imprimir el error en la consola del backend
        return {"error": str(e)}, 500  # Retornar un código 500 con el mensaje de error

if __name__ == "__main__":
    print("Archivo Ejecutado")
    uvicorn.run(app, host="0.0.0.0", port=8000)

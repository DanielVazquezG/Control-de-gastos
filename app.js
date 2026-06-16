import {
    auth,
    db,
    provider,
    signInWithPopup,
    signOut,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    updateDoc // Añadido para poder editar registros existentes
} from "./firebase.js";

let currentUser = null;

// Elementos de la interfaz
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const guardarBtn = document.getElementById("guardarBtn");
const exportarBtn = document.getElementById("exportarBtn");
const cancelarEditBtn = document.getElementById("cancelarEditBtn");
const formTitulo = document.getElementById("formTitulo");
const gastoIdInput = document.getElementById("gastoId");

// Eventos
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
guardarBtn.addEventListener("click", guardarGasto);
exportarBtn.addEventListener("click", exportarACSV);
cancelarEditBtn.addEventListener("click", limpiarFormulario);

async function login() {
    try {
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;

        loginBtn.style.display = "none";
        logoutBtn.style.display = "block";
        document.getElementById("app").style.display = "block";

        cargarGastos();
    } catch (error) {
        alert("Error al iniciar sesión: " + error.message);
    }
}

async function logout() {
    await signOut(auth);
    currentUser = null;
    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";
    document.getElementById("app").style.display = "none";
}

// Guarda un nuevo gasto o actualiza uno existente si está en modo edición
async function guardarGasto() {
    const id = gastoIdInput.value;
    const fecha = document.getElementById("fecha").value;
    const concepto = document.getElementById("concepto").value;
    const monto = Number(document.getElementById("monto").value);
    const tipo = document.getElementById("tipo").value;
    const categoria = document.getElementById("categoria").value;

    if (!fecha || !concepto || !monto) {
        alert("Por favor completa los campos obligatorios (Fecha, Concepto y Monto)");
        return;
    }

    try {
        // Guardamos todo en la colección global única "gastos_compartidos"
        if (id) {
            // MODO EDICIÓN: Actualiza el documento existente
            const docRef = doc(db, "gastos_compartidos", id);
            await updateDoc(docRef, {
                fecha,
                concepto,
                monto,
                tipo,
                categoria
            });
            alert("Gasto actualizado con éxito");
        } else {
            // MODO NUEVO: Crea un documento nuevo
            await addDoc(collection(db, "gastos_compartidos"), {
                fecha,
                concepto,
                monto,
                tipo,
                categoria,
                createdAt: Date.now(),
                usuario: currentUser.email // Guardamos referencia de quién lo anotó
            });
            alert("Gasto guardado con éxito");
        }

        limpiarFormulario();
        cargarGastos();

    } catch (error) {
        alert("Error al procesar el gasto: " + error.message);
    }
}

function obtenerCicloActual() {
    const hoy = new Date();
    const dia = hoy.getDate();
    let inicio;
    let fin;

    if (dia >= 17) {
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 17);
        fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 16);
    } else {
        inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 17);
        fin = new Date(hoy.getFullYear(), hoy.getMonth(), 16);
    }
    return { inicio, fin };
}

async function cargarGastos() {
    const lista = document.getElementById("listaGastos");
    lista.innerHTML = "";

    let totalPersonal = 0;
    let totalPareja = 0;

    try {
        // Consulta ordenada del más nuevo al más viejo usando la Fecha del gasto
        const q = query(
            collection(db, "gastos_compartidos"),
            orderBy("fecha", "desc"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const ciclo = obtenerCicloActual();

        snapshot.forEach((registro) => {
            const gasto = registro.data();
            const fechaGasto = new Date(gasto.fecha + "T00:00:00");

            // Filtrado del ciclo de facturación (Días 17 al 16)
            if (fechaGasto >= ciclo.inicio && fechaGasto <= ciclo.fin) {
                if (gasto.tipo === "personal") {
                    totalPersonal += gasto.monto;
                } else {
                    totalPareja += gasto.monto;
                }
            }

            // Crear la fila de la tabla
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${gasto.fecha}</td>
                <td><b>${gasto.concepto}</b></td>
                <td>${gasto.tipo}</td>
                <td>${gasto.categoria || "-"}</td>
                <td>$${gasto.monto.toFixed(2)}</td>
                <td>
                    <button class="btn-editar" data-id="${registro.id}">Editar</button>
                    <button class="btn-borrar" data-id="${registro.id}">Borrar</button>
                </td>
            `;

            // Configurar botón de Editar
            tr.querySelector(".btn-editar").addEventListener("click", () => {
                formTitulo.innerText = "Editar Gasto";
                gastoIdInput.value = registro.id;
                document.getElementById("fecha").value = gasto.fecha;
                document.getElementById("concepto").value = gasto.concepto;
                document.getElementById("monto").value = gasto.monto;
                document.getElementById("tipo").value = gasto.tipo;
                document.getElementById("categoria").value = gasto.categoria || "";
                guardarBtn.innerText = "Actualizar Gasto";
                cancelarEditBtn.style.display = "block";
                window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube la pantalla al formulario
            });

            // Configurar botón de Borrar
            tr.querySelector(".btn-borrar").addEventListener("click", async () => {
                if (confirm(`¿Estás seguro de que quieres eliminar "${gasto.concepto}"?`)) {
                    await deleteDoc(doc(db, "gastos_compartidos", registro.id));
                    cargarGastos();
                }
            });

            lista.appendChild(tr);
        });

        // Actualizar tarjetas de totales en la interfaz
        document.getElementById("totalPersonal").innerText = totalPersonal.toFixed(2);
        document.getElementById("totalPareja").innerText = totalPareja.toFixed(2);
        document.getElementById("totalGeneral").innerText = (totalPersonal + totalPareja).toFixed(2);

    } catch (error) {
        alert("Error al cargar los gastos: " + error.message);
    }
}

function limpiarFormulario() {
    formTitulo.innerText = "Nuevo Gasto";
    gastoIdInput.value = "";
    document.getElementById("concepto").value = "";
    document.getElementById("monto").value = "";
    document.getElementById("categoria").value = "";
    document.getElementById("tipo").value = "personal";
    document.getElementById("fecha").value = new Date().toISOString().split("T")[0];
    guardarBtn.innerText = "Guardar Gasto";
    cancelarEditBtn.style.display = "none";
}

// Descarga en formato .CSV compatible al 100% con Excel y navegadores móviles (iOS/Android)
async function exportarACSV() {
    try {
        const q = query(collection(db, "gastos_compartidos"), orderBy("fecha", "desc"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            alert("No hay ningún dato registrado para exportar.");
            return;
        }

        // Definición de las cabeceras del CSV
        let csvContent = "Fecha,Concepto,Monto,Tipo,Categoria\n";

        snapshot.forEach((registro) => {
            const gasto = registro.data();
            // Reemplazamos comas y saltos de línea para evitar romper celdas en Excel
            const conceptoLimpio = gasto.concepto.replace(/,/g, " ").replace(/\n/g, " ");
            const categoriaLimpia = (gasto.categoria || "").replace(/,/g, " ").replace(/\n/g, " ");
            
            csvContent += `${gasto.fecha},${conceptoLimpio},${gasto.monto},${gasto.tipo},${categoriaLimpia}\n`;
        });

        // El secreto para iPhone/Safari y Excel: Usar el prefijo UTF-8 BOM ("\uFEFF") y un tipo Blob correcto
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const nombreArchivo = `Historial_Gastos_${new Date().toISOString().split('T')[0]}.csv`;

        // Soporte universal de descarga automática
        if (navigator.msSaveBlob) { 
            navigator.msSaveBlob(blob, nombreArchivo);
        } else {
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", nombreArchivo);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                // Alternativa extrema para navegadores muy viejos o configuraciones estrictas
                window.open(encodeURI("data:text/csv;charset=utf-8,\uFEFF" + csvContent));
            }
        }
    } catch (error) {
        alert("Error al generar el archivo: " + error.message);
    }
}

// Inicializar la fecha por defecto al cargar el archivo
document.getElementById("fecha").value = new Date().toISOString().split("T")[0];

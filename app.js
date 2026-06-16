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
    updateDoc
} from "./firebase.js";

let currentUser = null;

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const guardarBtn = document.getElementById("guardarBtn");
const exportarBtn = document.getElementById("exportarBtn");
const cancelarEditBtn = document.getElementById("cancelarEditBtn");
const formTitulo = document.getElementById("formTitulo");
const gastoIdInput = document.getElementById("gastoId");

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
        alert(error.message);
    }
}

async function logout() {
    await signOut(auth);
    currentUser = null;
    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";
    document.getElementById("app").style.display = "none";
}

async function guardarGasto() {
    const id = gastoIdInput.value;
    const fecha = document.getElementById("fecha").value;
    const concepto = document.getElementById("concepto").value;
    const monto = Number(document.getElementById("monto").value);
    const tipo = document.getElementById("tipo").value;
    const categoria = document.getElementById("categoria").value;

    if (!fecha || !concepto || !monto) {
        alert("Completa los campos");
        return;
    }

    try {
        if (id) {
            // MODO EDICIÓN: Actualiza el documento existente en tu colección personal
            const docRef = doc(db, "users", currentUser.uid, "gastos", id);
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
            await addDoc(collection(db, "users", currentUser.uid, "gastos"), {
                fecha,
                concepto,
                monto,
                tipo,
                categoria,
                createdAt: Date.now()
            });
            alert("Gasto guardado con éxito");
        }

        limpiarFormulario();
        cargarGastos();
    } catch (error) {
        alert("Error: " + error.message);
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
            collection(db, "users", currentUser.uid, "gastos"),
            orderBy("fecha", "desc"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const ciclo = obtenerCicloActual();

        snapshot.forEach((registro) => {
            const gasto = registro.data();
            const fechaGasto = new Date(gasto.fecha + "T00:00:00");

            if (fechaGasto >= ciclo.inicio && fechaGasto <= ciclo.fin) {
                if (gasto.tipo === "personal") {
                    totalPersonal += gasto.monto;
                } else {
                    totalPareja += gasto.monto;
                }
            }

            // Crear la fila de la tabla requerida
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${gasto.fecha}</td>
                <td><b>${gasto.concepto}</b></td>
                <td>${gasto.tipo}</td>
                <td>${gasto.categoria || "-"}</td>
                <td>$${gasto.monto.toFixed(2)}</td>
                <td>
                    <button class="btn-editar">Editar</button>
                    <button class="btn-borrar">Borrar</button>
                </td>
            `;

            // Acción Editar
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
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // Acción Borrar
            tr.querySelector(".btn-borrar").addEventListener("click", async () => {
                if (confirm(`¿Eliminar "${gasto.concepto}"?`)) {
                    await deleteDoc(doc(db, "users", currentUser.uid, "gastos", registro.id));
                    cargarGastos();
                }
            });

            lista.appendChild(tr);
        });

        document.getElementById("totalPersonal").innerText = totalPersonal.toFixed(2);
        document.getElementById("totalPareja").innerText = totalPareja.toFixed(2);
        document.getElementById("totalGeneral").innerText = (totalPersonal + totalPareja).toFixed(2);

    } catch (error) {
        alert("Error al cargar datos: " + error.message);
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

async function exportarACSV() {
    try {
        const q = query(
            collection(db, "users", currentUser.uid, "gastos"),
            orderBy("fecha", "desc")
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            alert("No hay datos para exportar.");
            return;
        }

        // Estructura de columnas para el .CSV
        let csvContent = "Fecha,Titulo,Pareja o Personal,Categoria,Monto\n";

        snapshot.forEach((registro) => {
            const gasto = registro.data();
            const conceptoLimpio = gasto.concepto.replace(/,/g, " ").replace(/\n/g, " ");
            const categoriaLimpia = (gasto.categoria || "").replace(/,/g, " ").replace(/\n/g, " ");
            
            csvContent += `${gasto.fecha},${conceptoLimpio},${gasto.tipo},${categoriaLimpia},${gasto.monto}\n`;
        });

        // Configuración especial para forzar la descarga en navegadores móviles/escritorio y añadir compatibilidad Excel (UTF-8 BOM)
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const nombreArchivo = `Historial_Gastos_${new Date().toISOString().split('T')[0]}.csv`;

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
            window.open(encodeURI("data:text/csv;charset=utf-8,\uFEFF" + csvContent));
        }
    } catch (error) {
        alert("Error al descargar: " + error.message);
    }
}

document.getElementById("fecha").value = new Date().toISOString().split("T")[0];

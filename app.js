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
    orderBy
} from "./firebase.js";

let currentUser = null;

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const guardarBtn = document.getElementById("guardarBtn");
const exportarBtn = document.getElementById("exportarBtn");

loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
guardarBtn.addEventListener("click", guardarGasto);
exportarBtn.addEventListener("click", exportarAExcel);

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

    const fecha = document.getElementById("fecha").value;
    const concepto = document.getElementById("concepto").value;
    const monto = Number(document.getElementById("monto").value);
    const tipo = document.getElementById("tipo").value;
    const categoria = document.getElementById("categoria").value;

    if (!fecha || !concepto || !monto) {
        alert("Completa los campos");
        return;
    }

    // Agregamos try/catch para atrapar errores en el celular
    try {
        await addDoc(
            collection(db, "users", currentUser.uid, "gastos"),
            {
                fecha,
                concepto,
                monto,
                tipo,
                categoria,
                createdAt: Date.now()
            }
        );

        // Si llega aquí, se guardó con éxito
        alert("¡Gasto guardado correctamente!");

        document.getElementById("concepto").value = "";
        document.getElementById("monto").value = "";
        document.getElementById("categoria").value = "";

        cargarGastos();

    } catch (error) {
        // Esto hará que tu iPhone te muestre el motivo exacto del fallo
        alert("Error al guardar: " + error.message);
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

    const q = query(
        collection(db, "users", currentUser.uid, "gastos"),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    const ciclo = obtenerCicloActual();

    snapshot.forEach((registro) => {

        const gasto = registro.data();

        const fechaGasto = new Date(gasto.fecha + "T00:00:00");

        if (
            fechaGasto >= ciclo.inicio &&
            fechaGasto <= ciclo.fin
        ) {

            if (gasto.tipo === "personal") {
                totalPersonal += gasto.monto;
            } else {
                totalPareja += gasto.monto;
            }
        }

        const div = document.createElement("div");

        div.innerHTML = `
            <hr>
            <b>${gasto.concepto}</b><br>
            ${gasto.fecha}<br>
            ${gasto.tipo} | ${gasto.categoria}<br>
            $${gasto.monto.toFixed(2)}
            <br><br>
            <button data-id="${registro.id}">
                Eliminar
            </button>
        `;

        div.querySelector("button")
            .addEventListener("click", async () => {

                await deleteDoc(
                    doc(
                        db,
                        "users",
                        currentUser.uid,
                        "gastos",
                        registro.id
                    )
                );

                cargarGastos();
            });

        lista.appendChild(div);

    });

    document.getElementById("totalPersonal").innerText =
        totalPersonal.toFixed(2);

    document.getElementById("totalPareja").innerText =
        totalPareja.toFixed(2);

    document.getElementById("totalGeneral").innerText =
        (totalPersonal + totalPareja).toFixed(2);
}

document.getElementById("fecha").value =
    new Date().toISOString().split("T")[0];

async function exportarAExcel() {
    try {
        // 1. Validar que el usuario esté logueado
        if (!currentUser) {
            alert("Debes iniciar sesión primero");
            return;
        }

        // 2. Consultar todos los gastos de la base de datos
        const q = query(
            collection(db, "users", currentUser.uid, "gastos"),
            orderBy("fecha", "desc")
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            alert("No hay datos disponibles para exportar.");
            return;
        }

        // 3. Crear las cabeceras de las columnas del Excel
        let csvContent = "Fecha,Concepto,Monto,Tipo,Categoria\n";

        // 4. Recorrer los registros y construir las filas del archivo
        snapshot.forEach((registro) => {
            const gasto = registro.data();
            
            // Limpiamos el concepto por si el usuario metió comas que puedan romper las celdas de Excel
            const conceptoLimpio = gasto.concepto.replace(/,/g, " ");
            const categoriaLimpia = gasto.categoria ? gasto.categoria.replace(/,/g, " ") : "";

            const fila = `${gasto.fecha},${conceptoLimpio},${gasto.monto},${gasto.tipo},${categoriaLimpia}\n`;
            csvContent += fila;
        });

        // 5. Crear el archivo descargable asegurando compatibilidad con caracteres en español (UTF-8 BOM)
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        
        // 6. Simular el clic para descargar el archivo en el dispositivo
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Historial_Gastos_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        alert("Error al exportar los datos: " + error.message);
    }
}

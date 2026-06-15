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

loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
guardarBtn.addEventListener("click", guardarGasto);

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

    document.getElementById("concepto").value = "";
    document.getElementById("monto").value = "";
    document.getElementById("categoria").value = "";

    cargarGastos();
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
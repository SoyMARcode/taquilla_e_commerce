/* Taquilla · lógica compartida de todas las vistas.
   Prototipo sin backend: usuarios, sesión, carrito y órdenes se guardan en el navegador. */
(function () {
  'use strict';

  const VISTAS = {
    login: 'login.html',
    registro: 'registro.html',
    eventos: 'listado_eventos.html',
    carrito: 'carrito_compras.html',
    pago: 'pasarela.html',
    confirmacion: 'confirmacion.html',
  };

  const EVENTOS = [
    { id: 'sonido-andino', nombre: 'Festival Sonido Andino', categoria: 'Conciertos', diaSemana: 'Sáb', dia: '14', mes: 'NOV', hora: '4:00 p. m.', lugar: 'Parque Norte', zona: 'General', precio: 180000, color: '#3A2A78', acento: '#5B47B8', destacado: true },
    { id: 'risas-sin-filtro', nombre: 'Risas sin Filtro · Stand-up', categoria: 'Stand-up', diaSemana: 'Sáb', dia: '21', mes: 'NOV', hora: '8:00 p. m.', lugar: 'Teatro Metropolitano', zona: 'VIP · Fila C', precio: 95000, color: '#1F4E5F', acento: '#2D7085' },
    { id: 'sinfonica-cine', nombre: 'Sinfónica: Noche de Cine', categoria: 'Conciertos', diaSemana: 'Sáb', dia: '28', mes: 'NOV', hora: '7:30 p. m.', lugar: 'Auditorio Central', zona: 'Platea', precio: 70000, color: '#4A2C20', acento: '#8A4A32' },
    { id: 'final-futbol', nombre: 'Final de fútbol local', categoria: 'Deportes', diaSemana: 'Sáb', dia: '05', mes: 'DIC', hora: '6:00 p. m.', lugar: 'Estadio', zona: 'Oriental', precio: 60000, color: '#1F4A2E', acento: '#2F7A4A' },
    { id: 'bernarda-alba', nombre: 'La casa de Bernarda Alba', categoria: 'Teatro', diaSemana: 'Vie', dia: '11', mes: 'DIC', hora: '7:00 p. m.', lugar: 'Teatro Pablo Tobón', zona: 'General', precio: 65000, color: '#5F1F3A', acento: '#8A2D55' },
  ];

  const CUPONES = { TAQUILLA10: 0.1, BIENVENIDA: 0.15 };
  const CARGO_SERVICIO = 0.1;
  const RESERVA_MS = 10 * 60 * 1000;
  const MAX_POR_EVENTO = 10;

  const CLAVES = {
    usuarios: 'tq_usuarios',
    sesion: 'tq_sesion',
    carrito: 'tq_carrito',
    reserva: 'tq_reserva',
    cupon: 'tq_cupon',
    ordenes: 'tq_ordenes',
    tarjeta: 'tq_tarjeta',
  };

  const params = new URLSearchParams(location.search);
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ---------- Almacenamiento ---------- */

  function area(tipo) {
    try { return tipo === 'sesion' ? window.sessionStorage : window.localStorage; } catch (e) { return null; }
  }
  function leer(clave, porDefecto, tipo) {
    try { const v = area(tipo).getItem(clave); return v === null ? porDefecto : JSON.parse(v); } catch (e) { return porDefecto; }
  }
  function guardar(clave, valor, tipo) {
    try { area(tipo).setItem(clave, JSON.stringify(valor)); } catch (e) { /* almacenamiento no disponible */ }
  }
  function borrar(clave, tipo) {
    try { area(tipo).removeItem(clave); } catch (e) { /* almacenamiento no disponible */ }
  }

  /* ---------- Utilidades ---------- */

  function dinero(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }
  function plural(n, uno, varios) { return `${n} ${n === 1 ? uno : varios}`; }
  function normalizar(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function soloDigitos(s) { return s.replace(/\D/g, ''); }
  function evento(id) { return EVENTOS.find((e) => e.id === id); }
  function destinoSeguro(valor, porDefecto) { return Object.values(VISTAS).includes(valor) ? valor : porDefecto; }
  const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);

  function aviso(mensaje, tipo) {
    let caja = document.getElementById('avisos');
    if (!caja) {
      caja = document.createElement('div');
      caja.id = 'avisos';
      caja.setAttribute('role', 'status');
      caja.setAttribute('aria-live', 'polite');
      caja.className = 'pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4';
      document.body.appendChild(caja);
    }
    const colores = {
      info: 'border-line bg-surface2 text-fg',
      exito: 'border-success/40 bg-success-bg text-success-fg',
      error: 'border-danger/40 bg-danger-bg text-danger-fg',
    };
    const el = document.createElement('div');
    el.className = `pointer-events-auto w-full max-w-sm translate-y-2 rounded-2xl border px-4 py-3 text-sm opacity-0 shadow-lg shadow-black/40 transition duration-300 ${colores[tipo] || colores.info}`;
    el.textContent = mensaje;
    caja.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('opacity-0', 'translate-y-2')));
    setTimeout(() => {
      el.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  function marcarError(input, mensaje) {
    input.setAttribute('aria-invalid', mensaje ? 'true' : 'false');
    const el = document.getElementById(input.id + '-error');
    if (el) {
      el.textContent = mensaje || '';
      el.classList.toggle('hidden', !mensaje);
    }
    return !mensaje;
  }

  function limpiarAlEscribir(form) {
    form.addEventListener('input', (e) => {
      if (e.target.matches('input, select')) marcarError(e.target, '');
    });
  }

  function enfocarPrimerError(form) {
    const campo = form.querySelector('[aria-invalid="true"]');
    if (campo) campo.focus();
  }

  function mostrarAlerta(el, html, tipo) {
    const estilos = {
      info: 'border-line bg-surface text-soft',
      error: 'border-danger/40 bg-danger-bg text-danger-fg',
    };
    el.className = `rounded-[14px] border px-4 py-3 text-sm leading-relaxed ${estilos[tipo] || estilos.info}`;
    el.innerHTML = html;
  }

  /* ---------- Sesión ---------- */

  function sesion() { return leer(CLAVES.sesion, null) || leer(CLAVES.sesion, null, 'sesion'); }
  function iniciarSesion(usuario, recordar) {
    cerrarSesion();
    guardar(CLAVES.sesion, { nombre: usuario.nombre, correo: usuario.correo }, recordar ? undefined : 'sesion');
  }
  function cerrarSesion() {
    borrar(CLAVES.sesion);
    borrar(CLAVES.sesion, 'sesion');
  }
  function primerNombre(nombre) { return (nombre || '').trim().split(/\s+/)[0] || ''; }

  /* ---------- Carrito ---------- */

  function carrito() {
    return leer(CLAVES.carrito, []).filter((i) => evento(i.id) && i.cantidad > 0);
  }

  function guardarCarrito(items) {
    const limpio = items.filter((i) => i.cantidad > 0);
    guardar(CLAVES.carrito, limpio);
    if (!limpio.length) {
      borrar(CLAVES.reserva);
      borrar(CLAVES.cupon);
    } else if (!leer(CLAVES.reserva, null)) {
      guardar(CLAVES.reserva, Date.now() + RESERVA_MS);
    }
    actualizarContadores();
  }

  function agregarAlCarrito(id, cantidad) {
    const items = carrito();
    const item = items.find((i) => i.id === id);
    if (item && item.cantidad >= MAX_POR_EVENTO) return false;
    if (item) item.cantidad = Math.min(MAX_POR_EVENTO, item.cantidad + cantidad);
    else items.push({ id, cantidad });
    guardarCarrito(items);
    return true;
  }

  function totales(items) {
    const entradas = items.reduce((s, i) => s + i.cantidad, 0);
    const subtotal = items.reduce((s, i) => s + evento(i.id).precio * i.cantidad, 0);
    const cupon = leer(CLAVES.cupon, null);
    const tasa = CUPONES[cupon] || 0;
    const descuento = Math.round(subtotal * tasa);
    const servicio = Math.round((subtotal - descuento) * CARGO_SERVICIO);
    return { entradas, subtotal, descuento, servicio, total: subtotal - descuento + servicio, cupon: tasa ? cupon : null };
  }

  /* Libera las entradas si el tiempo de reserva ya pasó. Devuelve true si expiró. */
  function revisarReserva() {
    const fin = leer(CLAVES.reserva, null);
    if (fin && Date.now() > fin && carrito().length) {
      guardarCarrito([]);
      return true;
    }
    return false;
  }

  function actualizarContadores() {
    const n = carrito().reduce((s, i) => s + i.cantidad, 0);
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = n > 99 ? '99+' : String(n);
      el.classList.toggle('hidden', n === 0);
    });
    $$('[data-cart-link]').forEach((el) => el.setAttribute('aria-label', `Carrito, ${plural(n, 'entrada', 'entradas')}`));
  }

  /* ---------- Plantillas ---------- */

  const ICONO_MAS = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>';
  const ICONO_BASURA = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"></path></svg>';

  function miniatura(e, clases) {
    return `<div aria-hidden="true" class="relative flex-none overflow-hidden rounded-[14px] ${clases}" style="background:${e.color}">
      <div class="absolute -right-[18px] -top-[18px] h-16 w-16 rounded-full border-[12px]" style="border-color:${e.acento}"></div>
      <div class="absolute bottom-3 left-3 h-[22px] w-[22px] rounded-full bg-brand"></div>
    </div>`;
  }

  function tarjetaDestacada(e) {
    return `<article class="relative mt-5 flex h-[196px] flex-col justify-end overflow-hidden rounded-[22px] p-[18px]" style="background:${e.color}">
      <div aria-hidden="true" class="absolute -right-10 -top-10 h-[200px] w-[200px] rounded-full border-[28px]" style="border-color:${e.acento}"></div>
      <div aria-hidden="true" class="absolute right-[60px] top-[30px] h-[60px] w-[60px] rounded-full bg-brand"></div>
      <span class="absolute left-4 top-4 flex h-[26px] items-center rounded-full bg-ink px-2.5 text-xs font-semibold">Destacado</span>
      <p class="relative text-[13px] text-violet-pale">${e.diaSemana.toUpperCase()} ${e.dia} ${e.mes} · ${e.lugar}</p>
      <h3 class="relative mt-1 font-display text-2xl font-bold leading-tight tracking-tight">${e.nombre}</h3>
      <div class="relative mt-2.5 flex items-center justify-between">
        <span class="text-sm text-violet-pale">Desde <b class="text-white">${dinero(e.precio)}</b></span>
        <button type="button" data-comprar="${e.id}" class="flex h-9 items-center rounded-full bg-fg px-4 text-sm font-semibold text-brand-ink transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet">Comprar</button>
      </div>
    </article>`;
  }

  function tarjetaEvento(e) {
    return `<article class="flex items-center gap-3.5 rounded-[18px] border border-surface2 bg-surface p-2.5">
      <div class="flex h-16 w-[60px] flex-none flex-col items-center justify-center rounded-[14px] bg-surface2">
        <span class="text-[11px] font-semibold text-brand">${e.mes}</span>
        <span class="font-display text-[22px] font-bold leading-none">${e.dia}</span>
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-[3px]">
        <h3 class="truncate text-[15px] font-semibold">${e.nombre}</h3>
        <p class="truncate text-[13px] text-muted">${e.lugar} · ${e.hora}</p>
        <p class="text-[13px] text-soft">Desde ${dinero(e.precio)}</p>
      </div>
      <button type="button" data-agregar="${e.id}" aria-label="Agregar ${e.nombre} al carrito" class="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-brand text-brand-ink transition hover:bg-brand-light active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface">${ICONO_MAS}</button>
    </article>`;
  }

  function itemCarrito(item) {
    const e = evento(item.id);
    const tope = item.cantidad >= MAX_POR_EVENTO;
    return `<article class="flex gap-3 rounded-[18px] border border-surface2 bg-surface p-3">
      ${miniatura(e, 'h-[92px] w-[76px]')}
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="flex justify-between gap-2">
          <h2 class="text-[15px] font-semibold leading-snug">${e.nombre}</h2>
          <button type="button" data-eliminar="${e.id}" aria-label="Eliminar ${e.nombre}" class="-mr-1.5 -mt-1.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg text-dim transition hover:bg-surface2 hover:text-danger">${ICONO_BASURA}</button>
        </div>
        <p class="mt-0.5 text-[13px] text-muted">${e.diaSemana} ${e.dia} ${e.mes.toLowerCase()} · ${e.zona}</p>
        <div class="mt-auto flex items-center justify-between pt-2">
          <span class="font-display text-[17px] font-bold">${dinero(e.precio * item.cantidad)}</span>
          <div class="flex items-center gap-1 rounded-xl bg-surface2 p-[3px]">
            <button type="button" data-menos="${e.id}" aria-label="Quitar una entrada de ${e.nombre}" class="h-[30px] w-[30px] rounded-[9px] bg-line text-lg leading-none text-fg transition hover:bg-line2">−</button>
            <span class="w-[26px] text-center text-[15px] font-semibold">${item.cantidad}</span>
            <button type="button" data-mas="${e.id}" aria-label="Agregar una entrada de ${e.nombre}" ${tope ? 'disabled' : ''} class="h-[30px] w-[30px] rounded-[9px] bg-brand text-lg leading-none text-brand-ink transition hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40">+</button>
          </div>
        </div>
      </div>
    </article>`;
  }

  function tarjetaEntrada(orden, item, indice) {
    const e = evento(item.id) || item;
    return `<article class="overflow-hidden rounded-[18px] border border-surface2 bg-surface">
      <div class="flex gap-3 p-3">
        ${miniatura(e, 'h-[72px] w-[64px]')}
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 class="text-[15px] font-semibold leading-snug">${item.nombre}</h3>
          <p class="text-[13px] text-muted">${item.fecha} · ${item.hora}</p>
          <p class="text-[13px] text-soft">${item.lugar} · ${item.zona}</p>
        </div>
      </div>
      <div class="flex items-center justify-between border-t border-dashed border-line px-3 py-2.5 text-[13px]">
        <span class="font-mono tracking-wide text-soft">${orden.id}-${indice + 1}</span>
        <span class="rounded-full bg-surface2 px-2.5 py-1 font-semibold">${plural(item.cantidad, 'entrada', 'entradas')}</span>
      </div>
    </article>`;
  }

  /* ---------- Comportamientos comunes ---------- */

  function iniciarComunes() {
    $$('[data-toggle-password]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.togglePassword);
        const mostrar = input.type === 'password';
        input.type = mostrar ? 'text' : 'password';
        btn.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
        btn.setAttribute('aria-pressed', String(mostrar));
        btn.querySelector('[data-icono="ojo"]').classList.toggle('hidden', mostrar);
        btn.querySelector('[data-icono="ojo-off"]').classList.toggle('hidden', !mostrar);
      });
    });

    $$('[data-aviso]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        aviso(el.dataset.aviso);
      });
    });

    // Enlace de perfil: ingresar si no hay sesión, salir si la hay
    const s = sesion();
    $$('[data-perfil]').forEach((a) => {
      a.href = s ? `${VISTAS.login}?salir=1` : VISTAS.login;
      const texto = a.querySelector('[data-perfil-texto]');
      if (texto) texto.textContent = s ? 'Salir' : 'Ingresar';
    });

    if (revisarReserva()) aviso('Tu reserva expiró y liberamos las entradas del carrito.', 'error');
    actualizarContadores();
  }

  /* ---------- Vistas ---------- */

  const vistas = {};

  vistas.login = function () {
    const alerta = $('#login-alerta');
    const volverParam = params.get('volver');
    const volver = destinoSeguro(volverParam, VISTAS.eventos);

    if (params.get('salir')) {
      cerrarSesion();
      aviso('Cerraste sesión. ¡Vuelve pronto!');
      history.replaceState(null, '', location.pathname);
    } else if (volverParam === VISTAS.pago) {
      mostrarAlerta(alerta, 'Inicia sesión para continuar con tu compra.', 'info');
    }

    if (volverParam) {
      $$('[data-conservar-volver]').forEach((a) => { a.href = `${a.getAttribute('href')}?volver=${encodeURIComponent(volver)}`; });
    }

    const form = $('#form-login');
    const correo = $('#email');
    const clave = $('#password');
    limpiarAlEscribir(form);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      alerta.className = 'hidden';
      const c = correo.value.trim().toLowerCase();
      let ok = marcarError(correo, !c ? 'Escribe tu correo.' : !correoValido(c) ? 'El correo no es válido.' : '');
      ok = marcarError(clave, clave.value ? '' : 'Escribe tu contraseña.') && ok;
      if (!ok) return enfocarPrimerError(form);

      const usuario = leer(CLAVES.usuarios, []).find((u) => u.correo === c);
      if (!usuario) {
        const enlace = `${VISTAS.registro}${volverParam ? `?volver=${encodeURIComponent(volver)}` : ''}`;
        mostrarAlerta(alerta, `No encontramos una cuenta con ese correo. <a href="${enlace}" class="font-semibold text-brand-light underline-offset-2 hover:underline">Crea una aquí</a>.`, 'error');
        return correo.focus();
      }
      if (usuario.clave !== clave.value) {
        marcarError(clave, 'La contraseña no es correcta.');
        return clave.focus();
      }

      iniciarSesion(usuario, $('#recordar').checked);
      location.href = volver;
    });

    $('#olvide').addEventListener('click', () => {
      const c = correo.value.trim();
      if (!correoValido(c)) {
        marcarError(correo, 'Escribe tu correo para recuperar la contraseña.');
        return correo.focus();
      }
      aviso(`Si ${c} tiene una cuenta, te enviaremos un enlace para restablecer la contraseña.`, 'exito');
    });

    $$('[data-social]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const proveedor = btn.dataset.social;
        iniciarSesion({ nombre: `Usuario ${proveedor}`, correo: '' }, true);
        aviso(`Conectado con ${proveedor}.`, 'exito');
        setTimeout(() => { location.href = volver; }, 700);
      });
    });
  };

  vistas.registro = function () {
    const volver = destinoSeguro(params.get('volver'), VISTAS.eventos);
    if (params.get('volver')) {
      $$('[data-conservar-volver]').forEach((a) => { a.href = `${a.getAttribute('href')}?volver=${encodeURIComponent(volver)}`; });
    }

    const form = $('#form-registro');
    const campos = {
      nombre: $('#nombre'), correo: $('#correo'), doc: $('#doc'), tel: $('#tel'), pass: $('#pass'), terminos: $('#terminos'),
    };
    limpiarAlEscribir(form);
    campos.terminos.addEventListener('change', () => marcarError(campos.terminos, ''));

    const barras = $$('[data-barra]');
    const textoFuerza = $('#fuerza-texto');
    const NIVELES = [
      { texto: 'Usa al menos 8 caracteres', color: 'bg-line' },
      { texto: 'Seguridad baja · usa 8+ caracteres, mayúsculas y números', color: 'bg-danger' },
      { texto: 'Seguridad media · agrega un número o símbolo', color: 'bg-brand' },
      { texto: 'Seguridad buena', color: 'bg-success' },
      { texto: 'Seguridad alta', color: 'bg-success' },
    ];
    function fuerza(c) {
      if (!c) return 0;
      let p = 0;
      if (c.length >= 8) p++;
      if (/[a-z]/.test(c) && /[A-Z]/.test(c)) p++;
      if (/\d/.test(c)) p++;
      if (/[^A-Za-z0-9]/.test(c)) p++;
      return Math.max(1, c.length < 8 ? Math.min(p, 1) : p);
    }
    campos.pass.addEventListener('input', () => {
      const nivel = fuerza(campos.pass.value);
      barras.forEach((b, i) => { b.className = `h-1 rounded-sm transition-colors ${i < nivel ? NIVELES[nivel].color : 'bg-line'}`; });
      textoFuerza.textContent = NIVELES[nivel].texto;
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = campos.nombre.value.trim().replace(/\s+/g, ' ');
      const correo = campos.correo.value.trim().toLowerCase();
      const doc = soloDigitos(campos.doc.value);
      const tel = soloDigitos(campos.tel.value);
      const usuarios = leer(CLAVES.usuarios, []);

      let ok = marcarError(campos.nombre, nombre.split(' ').length < 2 ? 'Escribe tu nombre y apellido.' : '');
      ok = marcarError(campos.correo, !correoValido(correo) ? 'El correo no es válido.' : usuarios.some((u) => u.correo === correo) ? 'Ya existe una cuenta con este correo.' : '') && ok;
      ok = marcarError(campos.doc, /^\d{6,12}$/.test(doc) ? '' : 'Entre 6 y 12 dígitos.') && ok;
      ok = marcarError(campos.tel, /^3\d{9}$/.test(tel) ? '' : 'Celular de 10 dígitos.') && ok;
      ok = marcarError(campos.pass, campos.pass.value.length >= 8 ? '' : 'Mínimo 8 caracteres.') && ok;
      ok = marcarError(campos.terminos, campos.terminos.checked ? '' : 'Debes aceptar los términos para continuar.') && ok;
      if (!ok) return enfocarPrimerError(form);

      const usuario = { nombre, correo, documento: doc, celular: tel, clave: campos.pass.value };
      usuarios.push(usuario);
      guardar(CLAVES.usuarios, usuarios);
      iniciarSesion(usuario, true);
      aviso(`¡Bienvenido, ${primerNombre(nombre)}! Tu cuenta está lista.`, 'exito');
      setTimeout(() => { location.href = volver; }, 800);
    });
  };

  vistas.eventos = function () {
    const s = sesion();
    $('#saludo').textContent = s ? `Hola, ${primerNombre(s.nombre)}` : 'Hola, bienvenido';

    const buscador = $('#buscar');
    const chips = $$('[data-categoria]');
    const destacadoEl = $('#destacado');
    const lista = $('#lista-eventos');
    const vacio = $('#sin-resultados');
    let categoria = 'Todos';

    const CHIP_BASE = 'h-9 flex-none rounded-full border px-4 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';
    const CHIP_ACTIVO = 'border-brand bg-brand font-semibold text-brand-ink';
    const CHIP_INACTIVO = 'border-line bg-surface text-fg hover:border-line2 hover:bg-surface2';

    function render() {
      chips.forEach((c) => {
        const activo = c.dataset.categoria === categoria;
        c.className = `${CHIP_BASE} ${activo ? CHIP_ACTIVO : CHIP_INACTIVO}`;
        c.setAttribute('aria-pressed', String(activo));
      });

      const texto = normalizar(buscador.value.trim());
      const filtrados = EVENTOS.filter((e) =>
        (categoria === 'Todos' || e.categoria === categoria) &&
        normalizar(`${e.nombre} ${e.lugar} ${e.categoria}`).includes(texto));

      const destacado = categoria === 'Todos' && !texto ? EVENTOS.find((e) => e.destacado) : null;
      destacadoEl.innerHTML = destacado ? tarjetaDestacada(destacado) : '';
      const resto = filtrados.filter((e) => e !== destacado);
      lista.innerHTML = resto.map(tarjetaEvento).join('');
      vacio.classList.toggle('hidden', resto.length > 0);
    }

    chips.forEach((c) => c.addEventListener('click', () => { categoria = c.dataset.categoria; render(); }));
    buscador.addEventListener('input', render);
    $('#ver-todos').addEventListener('click', () => {
      categoria = 'Todos';
      buscador.value = '';
      render();
    });
    $('#limpiar-filtros').addEventListener('click', () => $('#ver-todos').click());
    $('#nav-explorar').addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      buscador.focus();
    });

    document.addEventListener('click', (e) => {
      const agregar = e.target.closest('[data-agregar]');
      const comprar = e.target.closest('[data-comprar]');
      const id = (agregar && agregar.dataset.agregar) || (comprar && comprar.dataset.comprar);
      if (!id) return;
      const ev = evento(id);
      if (!agregarAlCarrito(id, 1)) return aviso(`Máximo ${MAX_POR_EVENTO} entradas por evento.`, 'error');
      if (comprar) location.href = VISTAS.carrito;
      else aviso(`Agregaste 1 entrada de ${ev.nombre}.`, 'exito');
    });

    render();
  };

  vistas.carrito = function () {
    const lista = $('#lista-carrito');
    const vacio = $('#carrito-vacio');
    const detalle = $('#carrito-detalle');
    const reservaEl = $('#reserva');
    const continuar = $('#continuar');
    const cupon = $('#cupon');
    const btnCupon = $('#aplicar-cupon');

    function render() {
      const items = carrito();
      const t = totales(items);
      $('#conteo').textContent = plural(t.entradas, 'entrada', 'entradas');
      lista.innerHTML = items.map(itemCarrito).join('');
      vacio.classList.toggle('hidden', items.length > 0);
      detalle.classList.toggle('hidden', !items.length);

      $('#subtotal-label').textContent = `Subtotal (${plural(t.entradas, 'entrada', 'entradas')})`;
      $('#subtotal').textContent = dinero(t.subtotal);
      $('#fila-descuento').classList.toggle('hidden', !t.descuento);
      $('#descuento-label').textContent = t.cupon ? `Descuento (${t.cupon})` : 'Descuento';
      $('#descuento').textContent = `−${dinero(t.descuento)}`;
      $('#servicio').textContent = dinero(t.servicio);
      $('#total').textContent = dinero(t.total);
      $('#continuar-total').textContent = dinero(t.total);

      cupon.value = t.cupon || cupon.value;
      cupon.readOnly = Boolean(t.cupon);
      btnCupon.textContent = t.cupon ? 'Quitar' : 'Aplicar';
      tick();
    }

    function tick() {
      const fin = leer(CLAVES.reserva, null);
      if (!fin || !carrito().length) return reservaEl.classList.add('hidden');
      const resta = fin - Date.now();
      if (resta <= 0) {
        guardarCarrito([]);
        aviso('Tu reserva expiró y liberamos las entradas.', 'error');
        return render();
      }
      reservaEl.classList.remove('hidden');
      const seg = Math.ceil(resta / 1000);
      $('#reserva-tiempo').textContent = `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`;
    }

    lista.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-menos], [data-mas], [data-eliminar]');
      if (!btn) return;
      const items = carrito();
      const id = btn.dataset.menos || btn.dataset.mas || btn.dataset.eliminar;
      const item = items.find((i) => i.id === id);
      if (!item) return;
      if ('mas' in btn.dataset) item.cantidad = Math.min(MAX_POR_EVENTO, item.cantidad + 1);
      else if ('menos' in btn.dataset) item.cantidad -= 1;
      else item.cantidad = 0;
      if (item.cantidad === 0) aviso(`Quitaste ${evento(id).nombre} del carrito.`);
      guardarCarrito(items);
      render();
    });

    cupon.addEventListener('input', () => marcarError(cupon, ''));
    function aplicarCupon() {
      if (totales(carrito()).cupon) {
        borrar(CLAVES.cupon);
        cupon.value = '';
        aviso('Quitaste el código de descuento.');
        return render();
      }
      const codigo = cupon.value.trim().toUpperCase();
      if (!codigo) return marcarError(cupon, 'Escribe un código.');
      if (!CUPONES[codigo]) return marcarError(cupon, 'Este código no es válido.');
      guardar(CLAVES.cupon, codigo);
      aviso(`Código ${codigo} aplicado: ${Math.round(CUPONES[codigo] * 100)}% de descuento.`, 'exito');
      render();
    }
    btnCupon.addEventListener('click', aplicarCupon);
    cupon.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarCupon(); } });

    continuar.addEventListener('click', (e) => {
      if (!carrito().length) {
        e.preventDefault();
        aviso('Agrega al menos una entrada para continuar.', 'error');
      }
    });

    setInterval(tick, 1000);
    render();
  };

  vistas.pago = function () {
    const items = carrito();
    if (!items.length) return location.replace(VISTAS.carrito);
    if (!sesion()) return location.replace(`${VISTAS.login}?volver=${VISTAS.pago}`);

    const t = totales(items);
    $('#resumen-detalle').textContent = `${plural(items.length, 'evento', 'eventos')} · ${plural(t.entradas, 'entrada', 'entradas')}`;
    $('#resumen-total').textContent = dinero(t.total);
    $('#pagar').textContent = `Pagar ${dinero(t.total)}`;

    const tarjetaGuardada = leer(CLAVES.tarjeta, null);
    if (tarjetaGuardada) {
      $('#titular').value = tarjetaGuardada.titular;
      const pista = $('#tarjeta-guardada');
      pista.textContent = `Tarjeta guardada: •••• ${tarjetaGuardada.ultimos4}`;
      pista.classList.remove('hidden');
    }

    // Selección de método de pago
    let metodo = 'tarjeta';
    const BTN_BASE = 'flex h-16 flex-col items-center justify-center gap-0.5 rounded-[14px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';
    const BTN_ACTIVO = 'border-2 border-brand bg-surface2 text-fg';
    const BTN_INACTIVO = 'border border-line bg-surface text-soft hover:border-line2 hover:bg-surface2';
    function seleccionar(m) {
      metodo = m;
      $$('[data-metodo]').forEach((b) => {
        const activo = b.dataset.metodo === m;
        b.className = `${BTN_BASE} ${activo ? BTN_ACTIVO : BTN_INACTIVO}`;
        b.setAttribute('aria-pressed', String(activo));
      });
      $$('[data-panel]').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== m));
    }
    $$('[data-metodo]').forEach((b) => b.addEventListener('click', () => seleccionar(b.dataset.metodo)));
    seleccionar('tarjeta');

    // Máscaras de entrada
    const num = $('#num');
    const venc = $('#venc');
    const cvv = $('#cvv');
    num.addEventListener('input', () => { num.value = soloDigitos(num.value).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); });
    venc.addEventListener('input', () => {
      const d = soloDigitos(venc.value).slice(0, 4);
      venc.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    });
    cvv.addEventListener('input', () => { cvv.value = soloDigitos(cvv.value).slice(0, 4); });
    $('#billetera-tel').addEventListener('input', (e) => { e.target.value = soloDigitos(e.target.value).slice(0, 10); });

    function luhn(n) {
      let suma = 0;
      for (let i = 0; i < n.length; i++) {
        let d = Number(n[n.length - 1 - i]);
        if (i % 2) { d *= 2; if (d > 9) d -= 9; }
        suma += d;
      }
      return suma % 10 === 0;
    }

    function vencimientoError(v) {
      const m = /^(\d{2})\/(\d{2})$/.exec(v);
      if (!m) return 'Usa MM/AA.';
      const mes = Number(m[1]);
      const anio = 2000 + Number(m[2]);
      if (mes < 1 || mes > 12) return 'Mes no válido.';
      const hoy = new Date();
      if (anio < hoy.getFullYear() || (anio === hoy.getFullYear() && mes < hoy.getMonth() + 1)) return 'Vencida.';
      return '';
    }

    const form = $('#form-pago');
    limpiarAlEscribir(form);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      let detalleMetodo = '';

      if (metodo === 'tarjeta') {
        const n = soloDigitos(num.value);
        ok = marcarError(num, n.length !== 16 ? 'Debe tener 16 dígitos.' : !luhn(n) ? 'El número de tarjeta no es válido.' : '') && ok;
        ok = marcarError($('#titular'), $('#titular').value.trim().length < 3 ? 'Escribe el nombre del titular.' : '') && ok;
        ok = marcarError(venc, vencimientoError(venc.value)) && ok;
        ok = marcarError(cvv, /^\d{3,4}$/.test(cvv.value) ? '' : '3 o 4 dígitos.') && ok;
        detalleMetodo = `Tarjeta •••• ${n.slice(-4)}`;
        if (ok) {
          if ($('#guardar-tarjeta').checked) guardar(CLAVES.tarjeta, { titular: $('#titular').value.trim(), ultimos4: n.slice(-4) });
          else borrar(CLAVES.tarjeta);
        }
      } else if (metodo === 'pse') {
        const banco = $('#banco');
        const correoPse = $('#pse-correo');
        ok = marcarError(banco, banco.value ? '' : 'Selecciona tu banco.') && ok;
        ok = marcarError(correoPse, correoValido(correoPse.value.trim()) ? '' : 'El correo no es válido.') && ok;
        detalleMetodo = `PSE · ${banco.value}`;
      } else {
        const app = $('#billetera-app');
        const tel = $('#billetera-tel');
        ok = marcarError(app, app.value ? '' : 'Selecciona una billetera.') && ok;
        ok = marcarError(tel, /^3\d{9}$/.test(tel.value) ? '' : 'Celular de 10 dígitos.') && ok;
        detalleMetodo = `${app.value} · ${tel.value.slice(0, 3)} ••• ${tel.value.slice(-4)}`;
      }

      if (!ok) return enfocarPrimerError(form);

      const pagar = $('#pagar');
      pagar.disabled = true;
      pagar.textContent = 'Procesando pago…';

      setTimeout(() => {
        const orden = {
          id: 'TQ-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
          fecha: new Date().toISOString(),
          metodo: detalleMetodo,
          correo: (sesion() || {}).correo || '',
          totales: t,
          items: items.map((i) => {
            const ev = evento(i.id);
            return { id: ev.id, nombre: ev.nombre, fecha: `${ev.diaSemana} ${ev.dia} ${ev.mes.toLowerCase()}`, hora: ev.hora, lugar: ev.lugar, zona: ev.zona, precio: ev.precio, cantidad: i.cantidad };
          }),
        };
        const ordenes = leer(CLAVES.ordenes, []);
        ordenes.push(orden);
        guardar(CLAVES.ordenes, ordenes);
        guardarCarrito([]);
        location.href = `${VISTAS.confirmacion}?orden=${orden.id}`;
      }, 1200);
    });
  };

  vistas.confirmacion = function () {
    const ordenes = leer(CLAVES.ordenes, []);
    const orden = ordenes.find((o) => o.id === params.get('orden'));

    if (orden) {
      $('#titulo').textContent = '¡Compra confirmada!';
      document.title = 'Compra confirmada · Taquilla';
      $('#pasos').classList.remove('hidden');
      $('#exito').classList.remove('hidden');
      $('#codigo-orden').textContent = orden.id;
      $('#total-orden').textContent = dinero(orden.totales.total);
      $('#metodo-orden').textContent = orden.metodo;
      $('#correo-orden').textContent = orden.correo || 'tu correo';
      $('#titulo-lista').textContent = 'Entradas de esta compra';
    }

    const mostrar = orden ? [orden] : ordenes.slice().reverse();
    $('#lista-entradas').innerHTML = mostrar
      .map((o) => o.items.map((item, i) => tarjetaEntrada(o, item, i)).join(''))
      .join('');
    $('#sin-entradas').classList.toggle('hidden', mostrar.length > 0);
  };

  document.addEventListener('DOMContentLoaded', () => {
    iniciarComunes();
    const vista = vistas[document.body.dataset.page];
    if (vista) vista();
  });
})();

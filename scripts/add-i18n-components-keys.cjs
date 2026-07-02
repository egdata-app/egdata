const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const enPath = path.join(root, "src/locales/en-US/translation.json");
const esPath = path.join(root, "src/locales/es-ES/translation.json");
const en = require(enPath);
const es = require(esPath);

const newKeys = {
  components: {
    stats: {
      title: "Stats",
      description: "Statistics about the platform",
      offers: "Offers",
      offersTooltip: "An offer is a purchasable item from the store",
      items: "Items",
      itemsTooltip: "An item is the entitlement for the launcher",
      tags: "Tags",
      offersYear: "Offers (Year)",
      itemsYear: "Items (Year)",
      assets: "Assets",
      assetsTooltip: "An asset is the game files",
      regPrices: "Reg. Prices",
      changes: "Changes",
      sandboxes: "Sandboxes",
      sandboxesTooltip: "A sandbox is the group of offers",
    },
    sandboxShell: {
      overview: "Overview",
      offers: "Offers",
      items: "Items",
      assets: "Assets",
      builds: "Builds",
      achievements: "Achievements",
      changelog: "Changelog",
      sandbox: "Sandbox",
      internalNamespace: "Internal namespace",
      storePage: "Store Page",
      updated: "Updated {{date}}",
      unrealEngine: "Unreal Engine",
      internalSandbox: "Internal Sandbox",
      releaseStatus: {
        prePurchase: "Pre-purchase",
        datePending: "Date pending",
        comingSoon: "Coming soon",
        released: "Released",
      },
    },
    comparison: {
      openCompareTray: "Open compare tray, {{count}} selected",
      compareSelected: "Compare selected offers",
      error: "Error",
      type: "Type",
      seller: "Seller",
      developer: "Developer",
      releaseDate: "Release Date",
      pcReleaseDate: "PC Release Date",
      genres: "Genres",
      platforms: "Platforms",
      remove: "Remove",
      current: "Current",
      lowest: "Lowest",
      noPriceFound: "No price found",
      noAgeRatingsFound: "No age ratings found",
      achievements: "Achievements:",
      ageRating: "Age Rating:",
      price: "Price:",
      unknown: "Unknown",
    },
    search: {
      sellers: "Sellers",
      noResults: "No results found",
      noResultsShort: "No results found.",
      allOfferTypes: "All Offer Types",
      tags: "Tags",
    },
    changelist: {
      title: "Changelist",
      loading: "Loading...",
      error: "Error: {{message}}",
      id: "ID",
      type: "Type",
      titleOrId: "Title/ID",
      date: "Date",
      new: "new",
      update: "update",
    },
    upcoming: {
      caption: "Upcoming Offers",
      loading: "Loading...",
      title: "Title",
      price: "Price",
      releaseDate: "Release Date",
      unknown: "Unknown",
      prePurchase: "Pre-Purchase",
    },
    giveaways: {
      title: "Giveaways",
      free: "Free",
      freeNow: "Free Now",
      startsIn: "Starts in",
      repeated: "Repeated:",
      yes: "Yes",
      no: "No",
      repeatedTooltip: "This offer has been gifted {{count}} times.",
    },
    giveawayStats: {
      title: "Giveaways in numbers",
      loading: "Loading...",
      totalValue: "Total Value",
      totalValueTooltip: "Total value including any active discounts",
      giveaways: "Giveaways",
      giveawaysTooltip: "Total number of giveaways that appear in the database",
      offers: "Offers",
      offersTooltip: "Total number of unique offers that have appeared in giveaways",
      repeated: "Repeated",
      repeatedTooltip: "Number of unique offers that appear multiple times in giveaways",
      sellers: "Sellers",
      sellersTooltip: "Total number of unique sellers providing offers",
    },
    offerCard: {
      openOffer: "Open offer {{title}}",
      free: "Free",
      comingSoon: "Coming Soon",
      earlyAccess: "Early Access",
      prePurchase: "Pre-Purchase",
      owned: "owned",
    },
    baseGame: {
      checkBaseGame: "Check the base game",
      partOfBundle: "This offer is part of",
    },
    notFound: {
      message: "The page you are looking for does not exist.",
    },
    sellerOffers: {
      error: "Error loading offers. Please try again.",
    },
    achievementsBlade: {
      noData: "No data",
      game: "Game",
      achievements: "Achievements",
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold",
    },
    topSection: {
      free: "Free",
    },
    featuredDiscounts: {
      free: "Free",
    },
    performanceTable: {
      title: "Performance",
      noPriorData: "No prior data",
      cardsView: "Cards view",
      chartView: "Chart view",
    },
    priceChart: {
      selectValue: "Select a value",
      last3Months: "Last 3 months",
      fetchingData: "Fetching latest data",
    },
    dateRangePicker: {
      from: "From",
      to: "To",
      maxRange: "Maximum range is 30 days",
      invalidRange: "Invalid date range",
    },
    regionalPricing: {
      region: "Region",
      price: "Price",
    },
    regionalPricingBadge: {
      analysis: "Regional pricing analysis",
      currentPrice: "Current price",
      suggestedPrice: "Suggested price",
      belowSuggested: "This deal is actually below that too \u2014 a great deal all around.",
      closeToSuggested: "This deal is close to that, and well below typical {{region}} pricing.",
    },
    countrySelector: {
      searchCountries: "Search countries...",
      noCountries: "No countries found",
    },
    countriesSelector: {
      searchCountries: "Search countries...",
      noCountries: "No countries found",
    },
    querySearch: {
      searchItems: "Search items...",
    },
    extendedSearch: {
      searchItems: "Search items...",
      noItems: "No items found.",
    },
    searchForm: {
      noResults: "No results found",
    },
    searchFormV2: {
      noResults: "No results found.",
    },
    androidBetaBanner: {
      dismiss: "Dismiss banner",
    },
    videoPlayer: {
      title: "{{title}}",
    },
    mediaSlider: {
      previousSlide: "Previous slide",
      nextSlide: "Next slide",
      image: "Image {{index}}",
      thumbnail: "Thumbnail {{index}}",
    },
    changelogItem: {
      action: "Action",
      type: "Type",
      oldValue: "Old value",
      newValue: "New value",
      previousValue: "Previous value:",
      newValueLabel: "New value:",
    },
    changelogCharts: {
      byWeekday: "Changes by Weekday",
      byWeekdayDesc: "Accumulated changes by weekday",
      typesOfChanges: "Types of Changes",
      typesOfChangesDesc: "Quantity of changes by type",
      byField: "Changes by Field",
      byFieldDesc: "Changes grouped by it's changed field",
      dailyDesc: "Showing daily changes for the last year",
      noData: "No data available to display.",
    },
    openEgl: {
      open: "Open",
    },
    openEgs: {
      store: "Store",
    },
    openLauncher: {
      play: "Play",
    },
    storeDropdown: {
      launcher: "Launcher",
    },
    prepurchasePopup: {
      title: "{{title}}",
    },
  },
  table: {
    pagination: {
      rowsPerPage: "Rows per page",
      pageOf: "Page {{page}} of {{total}}",
      goToFirst: "Go to first page",
      goToPrevious: "Go to previous page",
      goToNext: "Go to next page",
      goToLast: "Go to last page",
      previous: "Previous",
      next: "Next",
      morePages: "More pages",
    },
    toolbar: {
      platform: "Platform",
      status: "Status",
      type: "Type",
      platforms: "Platforms",
      fileExtensions: "File Extensions",
      filterOffers: "Filter offers...",
      filterItems: "Filter items...",
      filterFiles: "Filter files...",
      reset: "Reset",
    },
    viewOptions: {
      view: "View",
      toggleColumns: "Toggle columns",
    },
    facetedFilter: {
      noResults: "No results found.",
      selected: "selected",
      clearFilters: "Clear filters",
    },
    builds: {
      noResults: "No results.",
      donateKey: "Donate a Key",
    },
  },
  forms: {
    review: {
      submitTitle: "Submit a Review",
      editTitle: "Edit Review",
      description: "Share your thoughts about {{title}}",
      rating: "Rating",
      ratingError: "Rating must be between 1 and 10",
      recommend: "Would you recommend this product?",
      recommendError: "Please select yes or no",
      yes: "Yes",
      no: "No",
      title: "Title",
      titlePlaceholder: "Enter a title for your review",
      titleRequired: "Title is required",
      titleMinLength: "Title must be at least 3 characters",
      titleMinLengthLong: "Title must be at least 3 characters long",
      titleMaxLength: "Title must be less than 75 characters",
      reviewContent: "Review Content",
      contentMinLength: "Content must be at least 3 characters long",
      tags: "Tags (comma-separated)",
      tagsPlaceholder: "e.g. quality, design, performance",
      previous: "Previous",
      next: "Next",
      submit: "Submit Review",
      deleteReview: "Delete review",
      confirmDelete: "Are you sure you want to delete this review?",
      deleteDescription:
        "This action cannot be undone. This will permanently delete the review from our servers.",
      cancel: "Cancel",
      delete: "Delete",
      deleting: "Deleting...",
      errorSubmitting: "Error submitting review",
      errorDeleting: "Error deleting review",
      spamDetected: "Spam detected",
      defaultContent: "Please enter your review here",
    },
    androidBeta: {
      title: "Join the Beta",
      description:
        "Sign in with Google to register for the closed beta. We only need your email address.",
      spotsRemaining: "<strong>{{remaining}}</strong> of {{max}} spots remaining",
      betaFull: "Beta is Full",
      betaFullDesc:
        "All {{max}} spots have been taken. Check back later or follow us for updates on when more spots become available.",
      registering: "Registering you for the beta...",
      registered: "You are registered!",
      registeredDesc:
        "We have registered <strong>{{email}}</strong> for the closed beta.",
      registeredDesc2:
        "It may take a few hours until you are manually added to the testers list. Once added, you can join the beta here:",
      joinBeta: "Join the Beta on Google Play",
      alreadyRegistered: "Already Registered",
      alreadyRegisteredDesc:
        "<strong>{{email}}</strong> is already registered for the beta.",
      alreadyRegisteredDesc2:
        "If you have already been added to the testers list, you can join the beta here:",
      error: "Error",
      tryAgain: "Try Again",
      noCredential: "No credential received from Google",
      somethingWrong: "Something went wrong. Please try again.",
      googleFailed: "Google Sign-In failed. Please try again.",
    },
    donateKey: {
      donate: "Donate",
      error: "Error",
      success: "Success",
      successDesc:
        "Thank you for your donation! The item has been redeemed correctly and it's data will be available soon.",
      offerPage: "Offer page",
      somethingWrong: "Something went wrong. Please try again.",
    },
  },
  notifications: {
    push: {
      title: "Push Notifications",
      notSupported: "Push notifications are not supported in this browser.",
      setApiKey: "Please set your API key to enable push notifications.",
      manage: "Manage your push notification preferences.",
      unsubscribe: "Unsubscribe",
      subscribe: "Subscribe",
      subscribed: "Subscribed",
      notSubscribed: "Not subscribed",
      subscribeToTopic: "Subscribe to Topic",
      topicPlaceholder: "Enter topic name (e.g., game-updates)",
      subscribedTopics: "Subscribed Topics",
      clickToUnsubscribe: "Click on a topic to unsubscribe",
    },
    simple: {
      title: "Push Notifications",
      notSupported: "Push notifications are not supported in this browser.",
      subscribedDesc: "You're subscribed to {{count}} notification topics",
      notSubscribedDesc:
        "Get notified about Epic Games Store updates, free games, and more",
      subscribeToNotifications: "Subscribe to Notifications",
      unsubscribe: "Unsubscribe",
      chooseWhat: "Choose what you want to be notified about:",
      freeGames: "Free Games",
      freeGamesDesc: "Get notified when new free games are available",
      newReleases: "New Releases",
      newReleasesDesc: "Notifications for new game releases",
      priceDrops: "Price Drops",
      priceDropsDesc: "Get alerts when games go on sale",
      youWillReceive: "You'll receive notifications for:",
      subscribedTo: "Subscribed to {{name}}",
      unsubscribedFrom: "Unsubscribed from {{name}}",
      failedSubscribe: "Failed to subscribe to notifications",
      failedUnsubscribe: "Failed to unsubscribe from notifications",
      failedTopicSubscribe: "Failed to subscribe to topic",
      failedTopicUnsubscribe: "Failed to unsubscribe from topic",
      successSubscribe: "Successfully subscribed to notifications!",
      successUnsubscribe: "Successfully unsubscribed from notifications",
    },
    apiKey: {
      title: "API Key Management",
      label: "API Key",
      placeholderGenerated: "API key generated",
      placeholderNone: "No API key generated",
      regenerate: "Regenerate Key",
      generate: "Generate Key",
      clear: "Clear Key",
      generated: "New API key generated successfully!",
      copied: "API key copied to clipboard!",
      cleared: "API key cleared successfully!",
      failedGenerate: "Failed to generate API key",
      failedCopy: "Failed to copy API key",
      failedClear: "Failed to clear API key",
      noneToCopy: "No API key to copy",
      description:
        "Your API key is a UUID stored locally in your browser and is used to authenticate push notification requests. Use the regenerate button to create a new key if needed.",
    },
  },
  ui: {
    dialog: {
      close: "Close",
    },
    sheet: {
      close: "Close",
    },
    carousel: {
      previous: "Previous slide",
      next: "Next slide",
    },
    pagination: {
      previous: "Previous",
      next: "Next",
      morePages: "More pages",
    },
    priceRangeSlider: {
      priceRange: "Price Range",
      minPrice: "Min price",
      maxPrice: "Max price",
    },
  },
};

const newKeysEs = {
  components: {
    stats: {
      title: "Estadísticas",
      description: "Estadísticas sobre la plataforma",
      offers: "Ofertas",
      offersTooltip: "Una oferta es un item de catálogo comprable de la tienda",
      items: "Items",
      itemsTooltip: "Un item es el entitlement para el launcher",
      tags: "Etiquetas",
      offersYear: "Ofertas (Año)",
      itemsYear: "Items (Año)",
      assets: "Assets",
      assetsTooltip: "Un asset son los archivos del juego",
      regPrices: "Precios Reg.",
      changes: "Cambios",
      sandboxes: "Sandboxes",
      sandboxesTooltip: "Un Sandbox es el grupo de ofertas",
    },
    sandboxShell: {
      overview: "Resumen",
      offers: "Ofertas",
      items: "Items",
      assets: "Assets",
      builds: "Compilaciones",
      achievements: "Logros",
      changelog: "Changelog",
      sandbox: "Sandbox",
      internalNamespace: "Namespace interno",
      storePage: "Página de la tienda",
      updated: "Actualizado {{date}}",
      unrealEngine: "Unreal Engine",
      internalSandbox: "Sandbox interno",
      releaseStatus: {
        prePurchase: "Reserva",
        datePending: "Fecha pendiente",
        comingSoon: "Próximamente",
        released: "Lanzado",
      },
    },
    comparison: {
      openCompareTray: "Abrir bandeja de comparación, {{count}} seleccionados",
      compareSelected: "Comparar ofertas seleccionadas",
      error: "Error",
      type: "Tipo",
      seller: "Vendedor",
      developer: "Desarrollador",
      releaseDate: "Fecha de lanzamiento",
      pcReleaseDate: "Fecha de lanzamiento en PC",
      genres: "Géneros",
      platforms: "Plataformas",
      remove: "Quitar",
      current: "Actual",
      lowest: "Mínimo",
      noPriceFound: "No se encontró precio",
      noAgeRatingsFound: "No se encontraron clasificaciones por edad",
      achievements: "Logros:",
      ageRating: "Clasificación por edad:",
      price: "Precio:",
      unknown: "Desconocido",
    },
    search: {
      sellers: "Vendedores",
      noResults: "No se encontraron resultados",
      noResultsShort: "No se encontraron resultados.",
      allOfferTypes: "Todos los tipos de oferta",
      tags: "Etiquetas",
    },
    changelist: {
      title: "Lista de cambios",
      loading: "Cargando...",
      error: "Error: {{message}}",
      id: "ID",
      type: "Tipo",
      titleOrId: "Título/ID",
      date: "Fecha",
      new: "nuevo",
      update: "actualización",
    },
    upcoming: {
      caption: "Ofertas próximas",
      loading: "Cargando...",
      title: "Título",
      price: "Precio",
      releaseDate: "Fecha de lanzamiento",
      unknown: "Desconocido",
      prePurchase: "Reserva",
    },
    giveaways: {
      title: "Regalos",
      free: "Gratis",
      freeNow: "Gratis Ahora",
      startsIn: "Empieza en",
      repeated: "Repetido:",
      yes: "Sí",
      no: "No",
      repeatedTooltip: "Esta oferta ha sido regalada {{count}} veces.",
    },
    giveawayStats: {
      title: "Regalos en números",
      loading: "Cargando...",
      totalValue: "Valor Total",
      totalValueTooltip: "Valor total incluyendo cualquier descuento activo",
      giveaways: "Regalos",
      giveawaysTooltip: "Número total de regalos que aparecen en la base de datos",
      offers: "Ofertas",
      offersTooltip: "Número total de ofertas únicas que han aparecido en regalos",
      repeated: "Repetidos",
      repeatedTooltip: "Número de ofertas únicas que aparecen múltiples veces en regalos",
      sellers: "Vendedores",
      sellersTooltip: "Número total de vendedores únicos que proveen ofertas",
    },
    offerCard: {
      openOffer: "Abrir oferta {{title}}",
      free: "Gratis",
      comingSoon: "Próximamente",
      earlyAccess: "Acceso Anticipado",
      prePurchase: "Reserva",
      owned: "en propiedad",
    },
    baseGame: {
      checkBaseGame: "Ver el juego base",
      partOfBundle: "Esta oferta es parte de",
    },
    notFound: {
      message: "La página que buscas no existe.",
    },
    sellerOffers: {
      error: "Error al cargar las ofertas. Por favor, inténtalo de nuevo.",
    },
    achievementsBlade: {
      noData: "Sin datos",
      game: "Juego",
      achievements: "Logros",
      bronze: "Bronce",
      silver: "Plata",
      gold: "Oro",
    },
    topSection: {
      free: "Gratis",
    },
    featuredDiscounts: {
      free: "Gratis",
    },
    performanceTable: {
      title: "Rendimiento",
      noPriorData: "Sin datos previos",
      cardsView: "Vista de tarjetas",
      chartView: "Vista de gráfico",
    },
    priceChart: {
      selectValue: "Selecciona un valor",
      last3Months: "Últimos 3 meses",
      fetchingData: "Obteniendo los últimos datos",
    },
    dateRangePicker: {
      from: "Desde",
      to: "Hasta",
      maxRange: "El rango máximo es de 30 días",
      invalidRange: "Rango de fechas inválido",
    },
    regionalPricing: {
      region: "Región",
      price: "Precio",
    },
    regionalPricingBadge: {
      analysis: "Análisis de precios regionales",
      currentPrice: "Precio actual",
      suggestedPrice: "Precio sugerido",
      belowSuggested:
        "Esta oferta está por debajo de eso también \u2014 una gran oferta en todos los sentidos.",
      closeToSuggested:
        "Esta oferta está cerca de eso, y muy por debajo de los precios típicos de {{region}}.",
    },
    countrySelector: {
      searchCountries: "Buscar países...",
      noCountries: "No se encontraron países",
    },
    countriesSelector: {
      searchCountries: "Buscar países...",
      noCountries: "No se encontraron países",
    },
    querySearch: {
      searchItems: "Buscar items...",
    },
    extendedSearch: {
      searchItems: "Buscar items...",
      noItems: "No se encontraron items.",
    },
    searchForm: {
      noResults: "No se encontraron resultados",
    },
    searchFormV2: {
      noResults: "No se encontraron resultados.",
    },
    androidBetaBanner: {
      dismiss: "Cerrar banner",
    },
    videoPlayer: {
      title: "{{title}}",
    },
    mediaSlider: {
      previousSlide: "Diapositiva anterior",
      nextSlide: "Diapositiva siguiente",
      image: "Imagen {{index}}",
      thumbnail: "Miniatura {{index}}",
    },
    changelogItem: {
      action: "Acción",
      type: "Tipo",
      oldValue: "Valor anterior",
      newValue: "Valor nuevo",
      previousValue: "Valor previo:",
      newValueLabel: "Valor nuevo:",
    },
    changelogCharts: {
      byWeekday: "Cambios por día de la semana",
      byWeekdayDesc: "Cambios acumulados por día de la semana",
      typesOfChanges: "Tipos de cambios",
      typesOfChangesDesc: "Cantidad de cambios por tipo",
      byField: "Cambios por campo",
      byFieldDesc: "Cambios agrupados por el campo modificado",
      dailyDesc: "Mostrando los cambios diarios del último año",
      noData: "No hay datos disponibles para mostrar.",
    },
    openEgl: {
      open: "Abrir",
    },
    openEgs: {
      store: "Tienda",
    },
    openLauncher: {
      play: "Jugar",
    },
    storeDropdown: {
      launcher: "Launcher",
    },
    prepurchasePopup: {
      title: "{{title}}",
    },
  },
  table: {
    pagination: {
      rowsPerPage: "Filas por página",
      pageOf: "Página {{page}} de {{total}}",
      goToFirst: "Ir a la primera página",
      goToPrevious: "Ir a la página anterior",
      goToNext: "Ir a la página siguiente",
      goToLast: "Ir a la última página",
      previous: "Anterior",
      next: "Siguiente",
      morePages: "Más páginas",
    },
    toolbar: {
      platform: "Plataforma",
      status: "Estado",
      type: "Tipo",
      platforms: "Plataformas",
      fileExtensions: "Extensiones de archivo",
      filterOffers: "Filtrar ofertas...",
      filterItems: "Filtrar items...",
      filterFiles: "Filtrar archivos...",
      reset: "Restablecer",
    },
    viewOptions: {
      view: "Ver",
      toggleColumns: "Alternar columnas",
    },
    facetedFilter: {
      noResults: "No se encontraron resultados.",
      selected: "seleccionados",
      clearFilters: "Limpiar filtros",
    },
    builds: {
      noResults: "Sin resultados.",
      donateKey: "Donar una clave",
    },
  },
  forms: {
    review: {
      submitTitle: "Enviar una reseña",
      editTitle: "Editar reseña",
      description: "Comparte tu opinión sobre {{title}}",
      rating: "Valoración",
      ratingError: "La valoración debe estar entre 1 y 10",
      recommend: "¿Recomendarías este producto?",
      recommendError: "Por favor, selecciona sí o no",
      yes: "Sí",
      no: "No",
      title: "Título",
      titlePlaceholder: "Introduce un título para tu reseña",
      titleRequired: "El título es obligatorio",
      titleMinLength: "El título debe tener al menos 3 caracteres",
      titleMinLengthLong: "El título debe tener al menos 3 caracteres",
      titleMaxLength: "El título debe tener menos de 75 caracteres",
      reviewContent: "Contenido de la reseña",
      contentMinLength: "El contenido debe tener al menos 3 caracteres",
      tags: "Etiquetas (separadas por comas)",
      tagsPlaceholder: "p. ej. calidad, diseño, rendimiento",
      previous: "Anterior",
      next: "Siguiente",
      submit: "Enviar reseña",
      deleteReview: "Eliminar reseña",
      confirmDelete: "¿Estás seguro de que quieres eliminar esta reseña?",
      deleteDescription:
        "Esta acción no se puede deshacer. Esto eliminará permanentemente la reseña de nuestros servidores.",
      cancel: "Cancelar",
      delete: "Eliminar",
      deleting: "Eliminando...",
      errorSubmitting: "Error al enviar la reseña",
      errorDeleting: "Error al eliminar la reseña",
      spamDetected: "Spam detectado",
      defaultContent: "Por favor, escribe tu reseña aquí",
    },
    androidBeta: {
      title: "Únete a la Beta",
      description:
        "Inicia sesión con Google para registrarte en la beta cerrada. Solo necesitamos tu correo electrónico.",
      spotsRemaining: "<strong>{{remaining}}</strong> de {{max}} plazas disponibles",
      betaFull: "Beta llena",
      betaFullDesc:
        "Las {{max}} plazas han sido ocupadas. Vuelve más tarde o síguenos para estar al tanto de cuándo haya más plazas disponibles.",
      registering: "Registrándote para la beta...",
      registered: "¡Estás registrado!",
      registeredDesc:
        "Hemos registrado <strong>{{email}}</strong> para la beta cerrada.",
      registeredDesc2:
        "Puede tardar unas horas hasta que se te añada manualmente a la lista de testers. Una vez añadido, puedes unirte a la beta aquí:",
      joinBeta: "Únete a la Beta en Google Play",
      alreadyRegistered: "Ya registrado",
      alreadyRegisteredDesc:
        "<strong>{{email}}</strong> ya está registrado para la beta.",
      alreadyRegisteredDesc2:
        "Si ya se te ha añadido a la lista de testers, puedes unirte a la beta aquí:",
      error: "Error",
      tryAgain: "Intentar de nuevo",
      noCredential: "No se recibió credencial de Google",
      somethingWrong: "Algo salió mal. Por favor, inténtalo de nuevo.",
      googleFailed: "Error en el inicio de sesión de Google. Por favor, inténtalo de nuevo.",
    },
    donateKey: {
      donate: "Donar",
      error: "Error",
      success: "Éxito",
      successDesc:
        "¡Gracias por tu donación! El item se ha canjeado correctamente y sus datos estarán disponibles pronto.",
      offerPage: "Página de la oferta",
      somethingWrong: "Algo salió mal. Por favor, inténtalo de nuevo.",
    },
  },
  notifications: {
    push: {
      title: "Notificaciones Push",
      notSupported: "Las notificaciones push no son compatibles con este navegador.",
      setApiKey: "Por favor, configura tu API key para habilitar las notificaciones push.",
      manage: "Administra tus preferencias de notificaciones push.",
      unsubscribe: "Desuscribirse",
      subscribe: "Suscribirse",
      subscribed: "Suscrito",
      notSubscribed: "No suscrito",
      subscribeToTopic: "Suscribirse a un tema",
      topicPlaceholder: "Introduce el nombre del tema (p. ej., game-updates)",
      subscribedTopics: "Temas suscritos",
      clickToUnsubscribe: "Haz clic en un tema para desuscribirte",
    },
    simple: {
      title: "Notificaciones Push",
      notSupported: "Las notificaciones push no son compatibles con este navegador.",
      subscribedDesc: "Estás suscrito a {{count}} temas de notificación",
      notSubscribedDesc:
        "Recibe notificaciones sobre actualizaciones de la Epic Games Store, juegos gratis y más",
      subscribeToNotifications: "Suscribirse a notificaciones",
      unsubscribe: "Desuscribirse",
      chooseWhat: "Elige sobre qué quieres recibir notificaciones:",
      freeGames: "Juegos Gratis",
      freeGamesDesc: "Recibe notificaciones cuando haya nuevos juegos gratis disponibles",
      newReleases: "Nuevos Lanzamientos",
      newReleasesDesc: "Notificaciones de nuevos lanzamientos de juegos",
      priceDrops: "Bajadas de Precio",
      priceDropsDesc: "Recibe alertas cuando los juegos estén de oferta",
      youWillReceive: "Recibirás notificaciones para:",
      subscribedTo: "Suscrito a {{name}}",
      unsubscribedFrom: "Desuscrito de {{name}}",
      failedSubscribe: "Error al suscribirse a las notificaciones",
      failedUnsubscribe: "Error al desuscribirse de las notificaciones",
      failedTopicSubscribe: "Error al suscribirse al tema",
      failedTopicUnsubscribe: "Error al desuscribirse del tema",
      successSubscribe: "¡Suscrito a las notificaciones con éxito!",
      successUnsubscribe: "Desuscrito de las notificaciones con éxito",
    },
    apiKey: {
      title: "Gestión de API Key",
      label: "API Key",
      placeholderGenerated: "API key generada",
      placeholderNone: "No se ha generado API key",
      regenerate: "Regenerar Key",
      generate: "Generar Key",
      clear: "Borrar Key",
      generated: "¡Nueva API key generada con éxito!",
      copied: "¡API key copiada al portapapeles!",
      cleared: "¡API key borrada con éxito!",
      failedGenerate: "Error al generar la API key",
      failedCopy: "Error al copiar la API key",
      failedClear: "Error al borrar la API key",
      noneToCopy: "No hay API key para copiar",
      description:
        "Tu API key es un UUID almacenado localmente en tu navegador y se usa para autenticar las solicitudes de notificaciones push. Usa el botón regenerar para crear una nueva key si es necesario.",
    },
  },
  ui: {
    dialog: {
      close: "Cerrar",
    },
    sheet: {
      close: "Cerrar",
    },
    carousel: {
      previous: "Diapositiva anterior",
      next: "Diapositiva siguiente",
    },
    pagination: {
      previous: "Anterior",
      next: "Siguiente",
      morePages: "Más páginas",
    },
    priceRangeSlider: {
      priceRange: "Rango de precios",
      minPrice: "Precio mín",
      maxPrice: "Precio máx",
    },
  },
};

function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (
      source[key] !== null &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

const newEn = deepMerge(en, newKeys);
const newEs = deepMerge(es, newKeysEs);

fs.writeFileSync(enPath, JSON.stringify(newEn, null, 2) + "\n", "utf8");
fs.writeFileSync(esPath, JSON.stringify(newEs, null, 2) + "\n", "utf8");

function countKeys(obj, prefix = "") {
  let count = 0;
  for (const k in obj) {
    const path = prefix ? prefix + "." + k : k;
    if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
      count += countKeys(obj[k], path);
    } else {
      count++;
    }
  }
  return count;
}

console.log("EN keys:", countKeys(newEn));
console.log("ES keys:", countKeys(newEs));
console.log("components keys:", countKeys(newEn.components));
console.log("table keys:", countKeys(newEn.table));
console.log("forms keys:", countKeys(newEn.forms));
console.log("notifications keys:", countKeys(newEn.notifications));
console.log("ui keys:", countKeys(newEn.ui));
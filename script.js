(function(){
// ---------- DATA ----------
  var products = [
    { id:9, name:"Chocolate Cake", cat:"Cakes", desc:"Moist dark chocolate sponge with rich chocolate ganache.", price:145, unit:"1 slice", icon:"🍰" },
    { id:10, name:"Red Velvet Cake", cat:"Cakes", desc:"Velvety cocoa sponge layered with cream cheese frosting.", price:150, unit:"1 slice", icon:"🍰" },
    { id:11, name:"Carrot Cake", cat:"Cakes", desc:"Spiced carrot sponge with walnuts and cream cheese icing.", price:145, unit:"1 slice", icon:"🍰" },
    { id:12, name:"Vanilla Cupcake", cat:"Cakes", desc:"Light vanilla sponge topped with buttercream swirl.", price:75, unit:"1 pc", icon:"🧁" },
    { id:17, name:"Iced Coffee", cat:"Drinks", desc:"Cold-brewed house coffee served over ice.", price:110, unit:"1 cup", icon:"🥤" },
    { id:18, name:"Fresh Lemonade", cat:"Drinks", desc:"Hand-squeezed lemonade, lightly sweetened.", price:95, unit:"1 cup", icon:"🍋" }
  ];

  var categories = ["All","Bread","Drinks","Ice Cream","Cakes"];
  var activeCategory = "All";
  var searchTerm = "";
  var order = {}; // id -> qty

  var activeView = "home";
  var viewMeta = {};
  var viewTitles = { inventory:"Inventory", dashboard:"Dashboard", reports:"Reports", history:"History", settings:"Settings" };
  var salesHistory = []; // { date: Date, id, cat, name, qty, amount }

  // ---------- VIEW SWITCHING (sidebar) ----------
  var appEl = document.getElementById('app');
  var navButtons = document.querySelectorAll('.nav-btn[data-view]');
  var topbarSearchArea = document.getElementById('topbarSearchArea');
  var topbarViewTitle = document.getElementById('topbarViewTitle');
  var viewPlaceholder = document.getElementById('viewPlaceholder');
  var vpIcon = document.getElementById('vpIcon');
  var vpTitle = document.getElementById('vpTitle');
  var vpDesc = document.getElementById('vpDesc');
  var inventoryView = document.getElementById('inventoryView');
  var reportsView = document.getElementById('reportsView');
  var historyView = document.getElementById('historyView');
  var dashboardView = document.getElementById('dashboardView');
  var settingsView = document.getElementById('settingsView');

  function setActiveView(view){
    activeView = view;

    navButtons.forEach(function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-view') === view);
    });

    var isHome = view === 'home';
    var isInventory = view === 'inventory';
    var isReports = view === 'reports';
    var isHistory = view === 'history';
    var isDashboard = view === 'dashboard';
    var isSettings = view === 'settings';
    var isPlaceholder = !isHome && !isInventory && !isReports && !isHistory && !isDashboard && !isSettings;

    // Categories + product grid only show on Home
    categoriesEl.style.display = isHome ? 'flex' : 'none';
    gridEl.style.display = isHome ? 'grid' : 'none';

    // Dashboard gets its own real screen
    dashboardView.classList.toggle('show', isDashboard);
    if(isDashboard) renderDashboard();

    // Inventory gets its own real screen
    inventoryView.classList.toggle('show', isInventory);
    if(isInventory) renderStockList();

    // Reports gets its own real screen
    reportsView.classList.toggle('show', isReports);
    if(isReports) renderReportsTable();

    // History gets its own real screen
    historyView.classList.toggle('show', isHistory);
    if(isHistory) renderHistory();

    // Settings gets its own real screen
    settingsView.classList.toggle('show', isSettings);

    // Placeholder panel for the sections still coming soon
    viewPlaceholder.classList.toggle('show', isPlaceholder);
    if(isPlaceholder){
      var meta = viewMeta[view] || { icon:"🛠️", title:view, desc:"Coming soon." };
      vpIcon.textContent = meta.icon;
      vpTitle.textContent = meta.title;
      vpDesc.textContent = meta.desc;
    }

    // Topbar: search/filter only relevant on Home
    topbarSearchArea.style.display = isHome ? 'flex' : 'none';
    topbarViewTitle.style.display = isHome ? 'none' : 'block';
    if(!isHome){
      topbarViewTitle.textContent = viewTitles[view] || view;
    }

    // Order panel only relevant on Home
    appEl.classList.toggle('hide-order', !isHome);
  }

  navButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      setActiveView(btn.getAttribute('data-view'));
    });
  });

  // ---------- RENDER CATEGORIES ----------
  var categoriesEl = document.getElementById('categories');
  function renderCategories(){
    categoriesEl.innerHTML = "";
    categories.forEach(function(cat){
      var btn = document.createElement('button');
      btn.className = 'cat-btn' + (cat === activeCategory ? ' active' : '');
      btn.textContent = cat;
      btn.addEventListener('click', function(){
        activeCategory = cat;
        renderCategories();
        renderProducts();
      });
      categoriesEl.appendChild(btn);
    });
  }

  // ---------- RENDER PRODUCTS ----------
  var gridEl = document.getElementById('productGrid');

  function thumbInnerHtml(p){
    if(p.image){
      return '<img src="'+p.image+'" alt="'+p.name+'" style="width:100%;height:100%;object-fit:cover;">';
    }
    return p.icon;
  }

  // A product only has real stock tracking once it's gone through a stock form
  // (Morning Setup or Add Stock), which is what sets p.lot. Demo/catalog items
  // that were never given a quantity stay unlimited, same as before.
  function isTrackable(p){
    return p.lot != null;
  }
  // How many are still available to sell: the master stock (p.lot, only ever
  // changed by Record Sale) minus whatever is already sitting in the current
  // order/cart for this item.
  function stockRemaining(p){
    if(!isTrackable(p)) return null;
    return Math.max(0, p.lot - (order[p.id] || 0));
  }

  var toastEl = document.getElementById('toastEl');
  var toastTimer = null;
  function showToast(msg){
    if(!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 2200);
  }

  function renderProducts(){
    var term = searchTerm.trim().toLowerCase();
    var list = products.filter(function(p){
      var matchesCat = activeCategory === "All" || p.cat === activeCategory;
      var matchesSearch = !term || p.name.toLowerCase().indexOf(term) > -1 || p.cat.toLowerCase().indexOf(term) > -1;
      return matchesCat && matchesSearch;
    });

    gridEl.innerHTML = "";
    if(list.length === 0){
      var empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = "No items match your search.";
      gridEl.appendChild(empty);
      return;
    }

    list.forEach(function(p){
      var remaining = stockRemaining(p);
      var outOfStock = remaining !== null && remaining <= 0;

      var stockPillHtml = "";
      if(remaining !== null){
        stockPillHtml = '<span class="stock-pill'+(outOfStock ? ' stock-pill-out' : '')+'">'+
          (outOfStock ? 'Out of Stock' : remaining + ' left') +
        '</span>';
      }

      var card = document.createElement('div');
      card.className = 'product-card' + (outOfStock ? ' out-of-stock' : '');
      card.innerHTML =
        '<div class="product-thumb">'+thumbInnerHtml(p)+stockPillHtml+'</div>'+
        '<div class="product-info">'+
          '<h3>'+p.name+'</h3>'+
          '<p>'+p.desc+'</p>'+
          '<div class="price-row"><span class="price">₱'+p.price.toFixed(2)+'</span><span class="unit">/ '+p.unit+'</span></div>'+
        '</div>';
      card.addEventListener('click', function(){ addToOrder(p.id); });
      gridEl.appendChild(card);
    });
  }

  // ---------- ORDER LOGIC ----------
  function addToOrder(id){
    var p = products.find(function(pr){ return pr.id == id; });
    if(!p) return;
    if(isTrackable(p) && stockRemaining(p) <= 0){
      showToast(p.name + ' is Out of Stock');
      return;
    }
    order[id] = (order[id] || 0) + 1;
    renderOrder();
    renderProducts();
    // On narrower screens the order panel is a drawer; make sure it's visible
    // as soon as something is added, with a backdrop so it can be dismissed.
    openOrderPanel();
  }
  function changeQty(id, delta){
    if(!order[id]) return;
    if(delta > 0){
      var p = products.find(function(pr){ return pr.id == id; });
      if(p && isTrackable(p) && stockRemaining(p) <= 0){
        showToast(p.name + ' is Out of Stock');
        return;
      }
    }
    order[id] += delta;
    if(order[id] <= 0) delete order[id];
    renderOrder();
    renderProducts();
  }
  function removeItem(id){
    delete order[id];
    renderOrder();
    renderProducts();
  }
  function clearOrder(){
    order = {};
    renderOrder();
    renderProducts();
  }

  var orderListEl = document.getElementById('orderList');
  var recordSaleBtn = document.getElementById('recordSaleBtn');

  function renderOrder(){
    var ids = Object.keys(order);
    orderListEl.innerHTML = "";

    if(ids.length === 0){
      var empty = document.createElement('div');
      empty.className = 'order-empty';
      empty.textContent = "No items yet. Tap a product to add it to the order.";
      orderListEl.appendChild(empty);
      recordSaleBtn.disabled = true;
    } else {
      recordSaleBtn.disabled = false;
      ids.forEach(function(id){
        var p = products.find(function(pr){ return pr.id == id; });
        var qty = order[id];
        var row = document.createElement('div');
        row.className = 'order-item';
        row.innerHTML =
          '<div class="order-thumb">'+thumbInnerHtml(p)+'</div>'+
          '<div class="order-item-info">'+
            '<h4>'+p.name+'</h4>'+
            '<div class="qty-controls">'+
              '<button class="qty-btn" data-action="dec">−</button>'+
              '<span class="qty-val">'+qty+'x</span>'+
              '<button class="qty-btn" data-action="inc">+</button>'+
            '</div>'+
          '</div>'+
          '<div class="order-item-price">₱'+(p.price*qty).toFixed(2)+'</div>'+
          '<button class="remove-btn" title="Remove">✕</button>';

        row.querySelector('[data-action="dec"]').addEventListener('click', function(){ changeQty(id,-1); });
        row.querySelector('[data-action="inc"]').addEventListener('click', function(){ changeQty(id,1); });
        row.querySelector('.remove-btn').addEventListener('click', function(){ removeItem(id); });

        orderListEl.appendChild(row);
      });
    }

    updateSummary();
  }

  var discountInput = document.getElementById('discountInput');
  function updateSummary(){
    var subtotal = Object.keys(order).reduce(function(sum,id){
      var p = products.find(function(pr){ return pr.id == id; });
      return sum + p.price * order[id];
    }, 0);
    var discount = parseFloat(discountInput.value) || 0;
    if(discount > subtotal) discount = subtotal;
    var total = subtotal - discount;

    document.getElementById('sumSubtotal').textContent = '₱'+subtotal.toFixed(2);
    document.getElementById('sumTotal').textContent = '₱'+total.toFixed(2);
  }

  discountInput.addEventListener('input', updateSummary);
  document.getElementById('clearOrderBtn').addEventListener('click', clearOrder);
  document.getElementById('recordSaleBtn').addEventListener('click', function(){
    // Record this sale against each product, then clear the order
    var saleTime = new Date();
    var breadIdsSold = [];
    Object.keys(order).forEach(function(id){
      var p = products.find(function(pr){ return pr.id == id; });
      var qty = order[id];

      if(isTrackable(p)){
        // L.O.T / stock is the remaining count; selling reduces it. This applies
        // to any product that's had stock entered, not just Bread.
        p.lot = Math.max(0, p.lot - qty);
      }
      if(p.cat === 'Bread'){
        breadIdsSold.push(p.id);
      }

      salesHistory.push({ date: saleTime, id: p.id, cat: p.cat, name: p.name, qty: qty, amount: p.price * qty });
    });

    clearOrder();
    closeOrderPanel();
    if(activeView === 'reports') renderReportsTable();
    if(activeView === 'history') renderHistory();
    if(activeView === 'dashboard') renderDashboard();
    if(breadIdsSold.length) checkStockAlerts(breadIdsSold);
  });

  // ---------- INVENTORY: MORNING SETUP ACCORDION ----------
  var accordionItems = document.querySelectorAll('.ms-accordion-item');
  accordionItems.forEach(function(item){
    var header = item.querySelector('.ms-accordion-header');
    var panel = item.querySelector('.ms-accordion-panel');
    header.addEventListener('click', function(){
      var isOpen = item.classList.contains('open');
      accordionItems.forEach(function(it){
        it.classList.remove('open');
        it.querySelector('.ms-accordion-panel').classList.remove('open');
      });
      if(!isOpen){
        item.classList.add('open');
        panel.classList.add('open');
      }
    });
  });

  var UPLOAD_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="14" r="3.5"/></svg>';

  function setupMorningSetupSection(cfg){
    var uploadBox = document.getElementById(cfg.uploadBoxId);
    var uploadInner = document.getElementById(cfg.uploadInnerId);
    var photoInput = document.getElementById(cfg.photoInputId);
    var nameInput = document.getElementById(cfg.nameInputId);
    var priceInput = document.getElementById(cfg.priceInputId);
    var piecesInput = document.getElementById(cfg.piecesInputId);
    var kilosInput = document.getElementById(cfg.kilosInputId);
    var pullOutInput = document.getElementById(cfg.pullOutInputId);
    var lopInput = document.getElementById(cfg.lopInputId);
    var receivedInput = document.getElementById(cfg.receivedInputId);
    var deliveryInput = document.getElementById(cfg.deliveryInputId);
    var errorEl = document.getElementById(cfg.errorId);
    var addBtn = document.getElementById(cfg.addBtnId);

    var uploadedPhoto = null;

    // Confirmation line that appears under the Add Stock button
    var savedMsg = document.createElement('p');
    savedMsg.className = 'ms-saved-msg';
    savedMsg.style.display = 'none';
    addBtn.parentNode.insertBefore(savedMsg, addBtn.nextSibling);

    uploadBox.addEventListener('click', function(){
      photoInput.click();
    });

    photoInput.addEventListener('change', function(e){
      var file = e.target.files && e.target.files[0];
      if(!file) return;
      var reader = new FileReader();
      reader.onload = function(evt){
        uploadedPhoto = evt.target.result;

        var img = uploadBox.querySelector('.ms-upload-photo');
        if(!img){
          img = document.createElement('img');
          img.className = 'ms-upload-photo';
          uploadBox.insertBefore(img, uploadInner);
        }
        img.src = uploadedPhoto;
        img.alt = cfg.catValue + ' photo';

        uploadInner.innerHTML = UPLOAD_ICON_SVG + '<span>Change Photo</span>';
        uploadBox.classList.add('has-photo');
      };
      reader.readAsDataURL(file);
    });

    function resetForm(){
      nameInput.value = "";
      priceInput.value = "";
      piecesInput.value = "";
      kilosInput.value = "";
      pullOutInput.value = "";
      lopInput.value = "";
      receivedInput.value = "";
      deliveryInput.value = "";
      uploadedPhoto = null;
      photoInput.value = "";
      uploadBox.classList.remove('has-photo');
      var existingImg = uploadBox.querySelector('.ms-upload-photo');
      if(existingImg) existingImg.remove();
      uploadInner.innerHTML = UPLOAD_ICON_SVG + '<span>'+cfg.uploadPlaceholderText+'</span>';
      errorEl.style.display = 'none';
    }

    addBtn.addEventListener('click', function(){
      errorEl.style.display = 'none';
      savedMsg.style.display = 'none';

      var name = nameInput.value.trim();
      var price = parseFloat(priceInput.value);
      var pieces = parseInt(piecesInput.value, 10) || 0;
      var kilos = parseFloat(kilosInput.value) || 0;
      var pullOut = parseInt(pullOutInput.value, 10) || 0;
      var lop = parseInt(lopInput.value, 10) || 0;
      var received = parseInt(receivedInput.value, 10) || 0;
      var delivery = parseInt(deliveryInput.value, 10) || 0;

      if(!name || isNaN(price) || price <= 0){
        errorEl.textContent = cfg.errorText;
        errorEl.style.display = 'block';
        return;
      }

      // If this item already exists in this category, today's batch is added on
      // top of what's already there instead of creating a duplicate product.
      var existing = products.find(function(p){
        return p.cat === cfg.catValue && p.name.trim().toLowerCase() === name.toLowerCase();
      });

      var target;
      if(existing){
        var addedStock = pieces + lop + received - delivery - pullOut;
        existing.price = price;                                  // today's price wins
        existing.kilos = (existing.kilos || 0) + kilos;
        existing.pieces = (existing.pieces || 0) + pieces;
        existing.lop = (existing.lop || 0) + lop;
        existing.received = (existing.received || 0) + received;
        existing.delivery = (existing.delivery || 0) + delivery;
        existing.pullOut = (existing.pullOut || 0) + pullOut;
        existing.lot = Math.max(0, (existing.lot != null ? existing.lot : 0) + addedStock);
        existing.unit = existing.pieces ? existing.pieces+" pcs" : "1 pc";
        if(uploadedPhoto) existing.image = uploadedPhoto;        // only replace if a new one was picked
        target = existing;
        savedMsg.textContent = 'Added ' + addedStock + ' pcs to ' + existing.name + ' — now ' + existing.lot + ' pcs in stock.';
      } else {
        var nextId = products.reduce(function(max,p){ return Math.max(max, p.id); }, 0) + 1;
        var newProduct = {
          id: nextId,
          name: name,
          cat: cfg.catValue,
          desc: cfg.descText,
          price: price,
          unit: pieces ? pieces+" pcs" : "1 pc",
          icon: cfg.icon,
          image: uploadedPhoto,
          kilos: kilos,
          pieces: pieces,
          pullOut: pullOut,
          lop: lop,
          received: received,
          delivery: delivery,
          lot: pieces + lop + received - delivery - pullOut // Left Over Today starts as the full available stock
        };
        products.push(newProduct);
        target = newProduct;
        savedMsg.textContent = newProduct.name + ' added with ' + newProduct.lot + ' pcs in stock.';
      }

      savedMsg.style.display = 'block';
      resetForm();
      activeCategory = "All";
      renderCategories();
      renderProducts();
      renderStockList();
      if(activeView === 'reports') renderReportsTable();
      if(activeView === 'dashboard') renderDashboard();
      if(cfg.catValue === "Bread") checkStockAlerts([target.id]);
    });
  }

  setupMorningSetupSection({
    catValue: "Bread",
    icon: "🍞",
    uploadBoxId: "msUpload",
    uploadInnerId: "msUploadInner",
    photoInputId: "breadPhotoInput",
    nameInputId: "breadNameInput",
    priceInputId: "breadPriceInput",
    piecesInputId: "breadPiecesInput",
    kilosInputId: "breadKilosInput",
    pullOutInputId: "breadPullOutInput",
    lopInputId: "breadLopInput",
    receivedInputId: "breadReceivedInput",
    deliveryInputId: "breadDeliveryInput",
    errorId: "msError",
    addBtnId: "addBreadStockBtn",
    uploadPlaceholderText: "Upload Bread Photo",
    errorText: "Please enter at least a bread name and a valid price.",
    descText: "Freshly added bread stock."
  });

  setupMorningSetupSection({
    catValue: "Drinks",
    icon: "🥤",
    uploadBoxId: "msUploadDrink",
    uploadInnerId: "msUploadInnerDrink",
    photoInputId: "drinkPhotoInput",
    nameInputId: "drinkNameInput",
    priceInputId: "drinkPriceInput",
    piecesInputId: "drinkPiecesInput",
    kilosInputId: "drinkKilosInput",
    pullOutInputId: "drinkPullOutInput",
    lopInputId: "drinkLopInput",
    receivedInputId: "drinkReceivedInput",
    deliveryInputId: "drinkDeliveryInput",
    errorId: "msErrorDrink",
    addBtnId: "addDrinkStockBtn",
    uploadPlaceholderText: "Upload Drink Photo",
    errorText: "Please enter at least a drink name and a valid price.",
    descText: "Freshly added drink stock."
  });

  setupMorningSetupSection({
    catValue: "Ice Cream",
    icon: "🍦",
    uploadBoxId: "msUploadIcecream",
    uploadInnerId: "msUploadInnerIcecream",
    photoInputId: "icecreamPhotoInput",
    nameInputId: "icecreamNameInput",
    priceInputId: "icecreamPriceInput",
    piecesInputId: "icecreamPiecesInput",
    kilosInputId: "icecreamKilosInput",
    pullOutInputId: "icecreamPullOutInput",
    lopInputId: "icecreamLopInput",
    receivedInputId: "icecreamReceivedInput",
    deliveryInputId: "icecreamDeliveryInput",
    errorId: "msErrorIcecream",
    addBtnId: "addIcecreamStockBtn",
    uploadPlaceholderText: "Upload Ice Cream Photo",
    errorText: "Please enter at least a flavor name and a valid price.",
    descText: "Freshly added ice cream stock."
  });

  setupMorningSetupSection({
    catValue: "Cakes",
    icon: "🍰",
    uploadBoxId: "msUploadCake",
    uploadInnerId: "msUploadInnerCake",
    photoInputId: "cakePhotoInput",
    nameInputId: "cakeNameInput",
    priceInputId: "cakePriceInput",
    piecesInputId: "cakePiecesInput",
    kilosInputId: "cakeKilosInput",
    pullOutInputId: "cakePullOutInput",
    lopInputId: "cakeLopInput",
    receivedInputId: "cakeReceivedInput",
    deliveryInputId: "cakeDeliveryInput",
    errorId: "msErrorCake",
    addBtnId: "addCakeStockBtn",
    uploadPlaceholderText: "Upload Cake Photo",
    errorText: "Please enter at least a cake name and a valid price.",
    descText: "Freshly added cake stock."
  });

  // ---------- INVENTORY: ADD STOCK (ALL PRODUCTS) ----------
  var stockListEl = document.getElementById('stockList');
  var stockSearchInput = document.getElementById('stockSearchInput');
  var stockSearchTerm = "";
  var STOCK_CATS = ["Bread","Drinks","Ice Cream","Cakes"];
  var openStockRows = {}; // product id -> true, so rows stay open across re-renders

  function productLot(p){
    return (p.lot != null) ? p.lot : ((p.pieces||0) + (p.lop||0) + (p.received||0) - (p.delivery||0) - (p.pullOut||0));
  }

  function buildStockRow(p){
    var lot = productLot(p);
    var row = document.createElement('div');
    row.className = 'stock-item' + (openStockRows[p.id] ? ' open' : '');
    row.innerHTML =
      '<button class="stock-item-head" type="button">'+
        '<span class="stock-thumb"></span>'+
        '<span class="stock-item-text">'+
          '<span class="stock-item-name"></span>'+
          '<span class="stock-item-meta"></span>'+
        '</span>'+
        '<span class="stock-item-chevron">⌄</span>'+
      '</button>'+
      '<div class="stock-item-body">'+
        '<div class="stock-sub">Product details</div>'+
        '<div class="stock-grid">'+
          '<div class="ms-field"><label>Name</label><input type="text" data-f="name"></div>'+
          '<div class="ms-field"><label>Price</label><input type="number" min="0" step="0.01" data-f="price"></div>'+
          '<div class="ms-field"><label>Current Stock (L.O.T)</label><input type="number" min="0" step="1" data-f="lot"></div>'+
        '</div>'+
        '<div class="stock-sub">Add new batch</div>'+
        '<div class="stock-grid">'+
          '<div class="ms-field"><label>Add Pieces</label><input type="number" min="0" step="1" placeholder="0" data-f="pieces"></div>'+
          '<div class="ms-field"><label>Add Kilos</label><input type="number" min="0" step="0.1" placeholder="0" data-f="kilos"></div>'+
          '<div class="ms-field"><label>Add L.O.P</label><input type="number" min="0" step="1" placeholder="0" data-f="lop"></div>'+
          '<div class="ms-field"><label>Add Received</label><input type="number" min="0" step="1" placeholder="0" data-f="received"></div>'+
          '<div class="ms-field"><label>Add Delivery</label><input type="number" min="0" step="1" placeholder="0" data-f="delivery"></div>'+
          '<div class="ms-field"><label>Add Pull Out</label><input type="number" min="0" step="1" placeholder="0" data-f="pullOut"></div>'+
        '</div>'+
        '<p class="ms-error" data-el="err" style="display:none;"></p>'+
        '<p class="ms-saved-msg" data-el="ok" style="display:none;"></p>'+
        '<div class="stock-actions">'+
          '<button class="ms-submit stock-save" type="button">Save Changes</button>'+
          '<button class="stock-delete" type="button">Delete</button>'+
        '</div>'+
      '</div>';

    var nameEl = row.querySelector('.stock-item-name');
    var metaEl = row.querySelector('.stock-item-meta');
    row.querySelector('.stock-thumb').innerHTML = thumbInnerHtml(p);
    nameEl.textContent = p.name;
    metaEl.textContent = '₱'+p.price.toFixed(2)+' · '+lot+' pcs left';

    var f = {};
    row.querySelectorAll('[data-f]').forEach(function(input){
      f[input.getAttribute('data-f')] = input;
    });
    f.name.value = p.name;
    f.price.value = p.price;
    f.lot.value = lot;

    var errEl = row.querySelector('[data-el="err"]');
    var okEl = row.querySelector('[data-el="ok"]');

    row.querySelector('.stock-item-head').addEventListener('click', function(){
      var nowOpen = !row.classList.contains('open');
      row.classList.toggle('open', nowOpen);
      openStockRows[p.id] = nowOpen;
    });

    row.querySelector('.stock-save').addEventListener('click', function(){
      errEl.style.display = 'none';
      okEl.style.display = 'none';

      var newName = f.name.value.trim();
      var newPrice = parseFloat(f.price.value);
      var baseLot = parseInt(f.lot.value, 10);
      var addPieces = parseInt(f.pieces.value, 10) || 0;
      var addKilos = parseFloat(f.kilos.value) || 0;
      var addPullOut = parseInt(f.pullOut.value, 10) || 0;
      var addLop = parseInt(f.lop.value, 10) || 0;
      var addReceived = parseInt(f.received.value, 10) || 0;
      var addDelivery = parseInt(f.delivery.value, 10) || 0;

      if(!newName || isNaN(newPrice) || newPrice <= 0){
        errEl.textContent = "Please enter a name and a valid price.";
        errEl.style.display = 'block';
        return;
      }
      if(isNaN(baseLot) || baseLot < 0){
        errEl.textContent = "Current stock must be 0 or more.";
        errEl.style.display = 'block';
        return;
      }

      p.name = newName;
      p.price = newPrice;
      p.kilos = (p.kilos || 0) + addKilos;
      p.pieces = (p.pieces || 0) + addPieces;
      p.lop = (p.lop || 0) + addLop;
      p.received = (p.received || 0) + addReceived;
      p.delivery = (p.delivery || 0) + addDelivery;
      p.pullOut = (p.pullOut || 0) + addPullOut;
      // Whatever is in the Current Stock box, plus whatever new batch was entered
      p.lot = Math.max(0, baseLot + addPieces + addLop + addReceived - addDelivery - addPullOut);
      p.unit = p.pieces ? p.pieces+" pcs" : "1 pc";

      // Refresh this row in place so the confirmation stays visible
      nameEl.textContent = p.name;
      metaEl.textContent = '₱'+p.price.toFixed(2)+' · '+p.lot+' pcs left';
      f.lot.value = p.lot;
      f.pieces.value = "";
      f.kilos.value = "";
      f.pullOut.value = "";
      f.lop.value = "";
      f.received.value = "";
      f.delivery.value = "";

      okEl.textContent = 'Saved. ' + p.name + ' now has ' + p.lot + ' pcs in stock.';
      okEl.style.display = 'block';

      renderProducts();
      if(activeView === 'reports') renderReportsTable();
      if(activeView === 'dashboard') renderDashboard();
      if(p.cat === 'Bread') checkStockAlerts([p.id]);
    });

    var delBtn = row.querySelector('.stock-delete');
    var delArmed = false;
    var delTimer = null;
    delBtn.addEventListener('click', function(){
      if(!delArmed){
        delArmed = true;
        delBtn.textContent = 'Click again to delete';
        delBtn.classList.add('armed');
        delTimer = setTimeout(function(){
          delArmed = false;
          delBtn.textContent = 'Delete';
          delBtn.classList.remove('armed');
        }, 4000);
        return;
      }
      clearTimeout(delTimer);
      var idx = products.indexOf(p);
      if(idx > -1) products.splice(idx, 1);
      delete order[p.id];
      delete openStockRows[p.id];
      renderProducts();
      renderOrder();
      renderStockList();
      if(activeView === 'reports') renderReportsTable();
      if(activeView === 'dashboard') renderDashboard();
    });

    return row;
  }

  function renderStockList(){
    if(!stockListEl) return;
    stockListEl.innerHTML = "";
    var anyShown = false;
    var term = stockSearchTerm.trim().toLowerCase();

    STOCK_CATS.forEach(function(cat){
      var items = products.filter(function(p){
        if(p.cat !== cat) return false;
        if(!term) return true;
        return p.name.toLowerCase().indexOf(term) > -1 || cat.toLowerCase().indexOf(term) > -1;
      });
      if(items.length === 0) return;
      anyShown = true;

      var group = document.createElement('div');
      group.className = 'stock-group';

      var title = document.createElement('h4');
      title.className = 'stock-group-title';
      title.textContent = cat + ' · ' + items.length + (items.length === 1 ? ' item' : ' items');
      group.appendChild(title);

      items.forEach(function(p){ group.appendChild(buildStockRow(p)); });
      stockListEl.appendChild(group);
    });

    if(!anyShown){
      var empty = document.createElement('p');
      empty.className = 'stock-empty';
      empty.textContent = term
        ? "No products match \"" + stockSearchTerm.trim() + "\"."
        : "No products yet. Use the sections above to add your first bread, drink, ice cream or cake.";
      stockListEl.appendChild(empty);
    }
  }

  if(stockSearchInput){
    stockSearchInput.addEventListener('input', function(e){
      stockSearchTerm = e.target.value;
      renderStockList();
    });
  }

  // ---------- REPORTS ----------
  var reportsTableBody = document.getElementById('reportsTableBody');
  var reportsTotalCell = document.getElementById('reportsTotalCell');
  var downloadReportBtn = document.getElementById('downloadReportBtn');

  function money(n){ return '₱'+ (Math.round(n * 100) / 100).toString(); }

  function getBreadReportRows(){
    return products
      .filter(function(p){ return p.cat === 'Bread'; })
      .map(function(p){
        var kilos = p.kilos || 0;
        var pieces = p.pieces || 0;
        var lop = p.lop || 0;
        var received = p.received || 0;
        var delivery = p.delivery || 0;
        var pullOut = p.pullOut || 0;
        var available = pieces + lop + received - delivery - pullOut;
        // L.O.T = Left Over Today: remaining stock, starts equal to everything
        // available and is reduced each time a Record Sale is made for this bread.
        var lot = (p.lot != null) ? p.lot : available;
        if(lot < 0) lot = 0;
        // Sold = Pieces + L.O.P + Received - Delivery - Pull Out - L.O.T
        var sold = available - lot;
        if(sold < 0) sold = 0;
        // Sold Amount = Price * Sold
        var soldAmount = p.price * sold;
        return { name:p.name, kilos:kilos, price:p.price, pieces:pieces, lop:lop, received:received, delivery:delivery, pullOut:pullOut, lot:lot, sold:sold, soldAmount:soldAmount };
      });
  }

  function renderReportsTable(){
    var rows = getBreadReportRows();
    reportsTableBody.innerHTML = "";

    if(rows.length === 0){
      var tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="11" class="reports-empty">No bread stock has been added yet.</td>';
      reportsTableBody.appendChild(tr);
      reportsTotalCell.textContent = money(0);
      return;
    }

    var totalSales = 0;
    rows.forEach(function(r){
      totalSales += r.soldAmount;
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="report-name">'+r.name+'</td>'+
        '<td>'+r.kilos.toFixed(2)+'</td>'+
        '<td>₱'+r.price+'</td>'+
        '<td>'+r.pieces+'</td>'+
        '<td>'+r.lop+'</td>'+
        '<td>'+r.received+'</td>'+
        '<td>'+r.delivery+'</td>'+
        '<td>'+r.pullOut+'</td>'+
        '<td>'+r.lot+'</td>'+
        '<td>'+r.sold+'</td>'+
        '<td'+(r.soldAmount === 0 ? ' class="zero-amount"' : '')+'>'+money(r.soldAmount)+'</td>';
      reportsTableBody.appendChild(tr);
    });

    reportsTotalCell.textContent = money(totalSales);
    reportsTotalCell.className = totalSales === 0 ? 'zero-amount' : '';
  }

  downloadReportBtn.addEventListener('click', function(){
    var rows = getBreadReportRows();
    var header = ["Bread","Kilos","Price","Pieces","L.O.P","Received","Delivery","Pull Out","L.O.T","Sold","Sold Amount"];
    var lines = [header.join(",")];
    var totalSales = 0;
    rows.forEach(function(r){
      totalSales += r.soldAmount;
      lines.push([
        '"'+r.name.replace(/"/g,'""')+'"',
        r.kilos.toFixed(2),
        r.price,
        r.pieces,
        r.lop,
        r.received,
        r.delivery,
        r.pullOut,
        r.lot,
        r.sold,
        r.soldAmount.toFixed(2)
      ].join(","));
    });
    lines.push(["TOTAL SALES","","","","","","","","","",totalSales.toFixed(2)].join(","));

    var csvContent = lines.join("\n");
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var dateStr = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = 'daily-bakery-report-'+dateStr+'.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // ---------- HISTORY ----------
  var historyGroupsEl = document.getElementById('historyGroups');
  var historySearchInput = document.getElementById('historySearchInput');
  var historySearchTerm = "";

  function renderHistory(){
    var term = historySearchTerm.trim().toLowerCase();
    var filtered = salesHistory.filter(function(entry){
      return !term || entry.name.toLowerCase().indexOf(term) > -1;
    });

    historyGroupsEl.innerHTML = "";

    if(filtered.length === 0){
      var empty = document.createElement('p');
      empty.className = 'history-empty';
      empty.textContent = salesHistory.length === 0
        ? "No purchases recorded yet. Completed sales will show up here."
        : "No purchases match that search.";
      historyGroupsEl.appendChild(empty);
      return;
    }

    // Group entries by month/year, most recent first; entries within a group also newest first
    var groups = {}; // key -> { label, entries: [] }
    filtered.forEach(function(entry){
      var key = entry.date.getFullYear()+'-'+entry.date.getMonth();
      if(!groups[key]){
        groups[key] = {
          label: entry.date.toLocaleDateString('en-US', { month:'long', year:'numeric' }),
          sortKey: entry.date.getFullYear()*12 + entry.date.getMonth(),
          entries: []
        };
      }
      groups[key].entries.push(entry);
    });

    var groupList = Object.keys(groups).map(function(k){ return groups[k]; });
    groupList.sort(function(a,b){ return b.sortKey - a.sortKey; });

    groupList.forEach(function(group){
      group.entries.sort(function(a,b){ return b.date - a.date; });

      var groupEl = document.createElement('div');
      groupEl.className = 'history-month-group';

      var rowsHtml = group.entries.map(function(entry){
        return '<tr>'+
          '<td>'+entry.date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })+'</td>'+
          '<td class="hist-bread">'+entry.name+'</td>'+
          '<td>'+entry.qty+'</td>'+
          '<td>₱'+entry.amount.toFixed(2)+'</td>'+
        '</tr>';
      }).join('');

      groupEl.innerHTML =
        '<h3 class="hist-month">'+group.label+'</h3>'+
        '<div class="history-table-wrap">'+
          '<table class="history-table">'+
            '<thead><tr><th>Date</th><th>Bread</th><th>Quantity</th><th>Total Amount</th></tr></thead>'+
            '<tbody>'+rowsHtml+'</tbody>'+
          '</table>'+
        '</div>';

      historyGroupsEl.appendChild(groupEl);
    });
  }

  historySearchInput.addEventListener('input', function(e){
    historySearchTerm = e.target.value;
    renderHistory();
  });

  // ---------- DASHBOARD ----------
  var DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  function isSameDay(a, b){
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  function getWeekStart(d){
    var start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    start.setDate(start.getDate() - start.getDay()); // back up to Sunday
    return start;
  }

  function renderDashboard(){
    var now = new Date();
    var weekStart = getWeekStart(now);

    var todaysEntries = salesHistory.filter(function(e){ return isSameDay(e.date, now); });
    var weekEntries = salesHistory.filter(function(e){
      var daysSinceStart = Math.floor((e.date - weekStart) / 86400000);
      return daysSinceStart >= 0 && daysSinceStart < 7;
    });

    // --- Stat card 1: Today's Sales ---
    var todaySalesTotal = todaysEntries.reduce(function(sum,e){ return sum + e.amount; }, 0);
    var todayOrderTimes = {};
    todaysEntries.forEach(function(e){ todayOrderTimes[e.date.getTime()] = true; });
    var todayOrderCount = Object.keys(todayOrderTimes).length;
    document.getElementById('dashTodaySales').textContent = '₱'+todaySalesTotal.toFixed(2);
    document.getElementById('dashTodayOrders').textContent = todayOrderCount + (todayOrderCount === 1 ? ' order today' : ' orders today');

    // --- Stat card 2: Total Units Sold (today) ---
    var unitsToday = todaysEntries.reduce(function(sum,e){ return sum + e.qty; }, 0);
    document.getElementById('dashUnitsSold').textContent = unitsToday;

    // --- Stat card 3: Total Production ---
    var breadProducts = products.filter(function(p){ return p.cat === 'Bread'; });
    var totalProduced = breadProducts.reduce(function(sum,p){ return sum + (p.pieces||0) + (p.lop||0) + (p.received||0) - (p.delivery||0); }, 0);
    var breadSoldToday = todaysEntries.filter(function(e){ return e.cat === 'Bread'; }).reduce(function(sum,e){ return sum + e.qty; }, 0);
    var producedPct = totalProduced > 0 ? Math.round((breadSoldToday / totalProduced) * 100) : 0;
    document.getElementById('dashProduction').textContent = breadSoldToday + '/' + totalProduced;
    document.getElementById('dashProductionPct').textContent = producedPct + '% sold today';

    // --- Chart: revenue by day, this week ---
    var dayTotals = [0,0,0,0,0,0,0];
    weekEntries.forEach(function(e){
      var idx = Math.floor((e.date - weekStart) / 86400000);
      if(idx >= 0 && idx < 7) dayTotals[idx] += e.amount;
    });
    var maxVal = Math.max.apply(null, dayTotals);
    var chartEl = document.getElementById('dashChart');
    chartEl.innerHTML = "";

    if(maxVal === 0){
      var emptyMsg = document.createElement('div');
      emptyMsg.className = 'dash-chart-empty';
      emptyMsg.textContent = "No sales recorded yet this week.";
      chartEl.appendChild(emptyMsg);
    } else {
      var peakIdx = dayTotals.indexOf(maxVal);
      dayTotals.forEach(function(val, idx){
        var heightPct = Math.max((val / maxVal) * 100, 3);
        var isActive = idx === peakIdx;
        var col = document.createElement('div');
        col.className = 'dash-chart-col';
        col.innerHTML =
          '<div class="dash-chart-bar-track">'+
            (isActive ? '<div class="dash-chart-bubble">₱'+val.toFixed(2)+'</div>' : '')+
            '<div class="dash-chart-bar'+(isActive ? ' active' : '')+'" style="height:'+heightPct+'%;"></div>'+
          '</div>'+
          '<div class="dash-chart-daylabel'+(isActive ? ' active' : '')+'">'+DAY_LABELS[idx]+'</div>';
        chartEl.appendChild(col);
      });
    }

    // --- Business Data (this week) ---
    var weekOrderTimes = {};
    weekEntries.forEach(function(e){ weekOrderTimes[e.date.getTime()] = true; });
    var weekOrderCount = Object.keys(weekOrderTimes).length;
    var weekRevenue = weekEntries.reduce(function(sum,e){ return sum + e.amount; }, 0);
    var avgOrderValue = weekOrderCount > 0 ? weekRevenue / weekOrderCount : 0;

    document.getElementById('dashCustomers').textContent = weekOrderCount;
    document.getElementById('dashOrders').textContent = weekOrderCount;
    document.getElementById('dashAOV').textContent = '₱'+avgOrderValue.toFixed(2);

    // --- Trending Breads (this week) ---
    var breadTotals = {}; // id -> { id, name, qty }
    weekEntries.filter(function(e){ return e.cat === 'Bread'; }).forEach(function(e){
      if(!breadTotals[e.id]) breadTotals[e.id] = { id:e.id, name:e.name, qty:0 };
      breadTotals[e.id].qty += e.qty;
    });
    var trendingList = Object.keys(breadTotals).map(function(k){ return breadTotals[k]; });
    trendingList.sort(function(a,b){ return b.qty - a.qty; });
    trendingList = trendingList.slice(0, 5);

    var trendingEl = document.getElementById('dashTrendingList');
    trendingEl.innerHTML = "";
    if(trendingList.length === 0){
      var trendEmpty = document.createElement('div');
      trendEmpty.className = 'dash-trend-empty';
      trendEmpty.textContent = "No bread sales yet this week — trending items will show up here.";
      trendingEl.appendChild(trendEmpty);
    } else {
      trendingList.forEach(function(item){
        var product = products.find(function(p){ return p.id === item.id; });
        var thumbHtml = product ? thumbInnerHtml(product) : "🍞";
        var row = document.createElement('div');
        row.className = 'dash-trend-row';
        row.innerHTML =
          '<div class="dash-trend-thumb">'+thumbHtml+'</div>'+
          '<div class="dash-trend-name">'+item.name+'</div>'+
          '<div class="dash-trend-orders">'+item.qty+' Orders</div>';
        trendingEl.appendChild(row);
      });
    }
  }

  // ---------- SEARCH / FILTER ----------
  var searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', function(e){
    searchTerm = e.target.value;
    renderProducts();
  });
  document.getElementById('clearFilterBtn').addEventListener('click', function(){
    searchTerm = "";
    activeCategory = "All";
    searchInput.value = "";
    renderCategories();
    renderProducts();
  });

  // ---------- MOBILE ORDER TOGGLE ----------
  var orderPanel = document.getElementById('orderPanel');
  var orderPanelBackdrop = document.getElementById('orderPanelBackdrop');
  var orderPanelCloseBtn = document.getElementById('orderPanelClose');

  function openOrderPanel(){
    orderPanel.classList.add('open');
    orderPanelBackdrop.classList.add('show');
  }
  function closeOrderPanel(){
    orderPanel.classList.remove('open');
    orderPanelBackdrop.classList.remove('show');
  }
  function toggleOrderPanel(){
    if(orderPanel.classList.contains('open')){
      closeOrderPanel();
    } else {
      openOrderPanel();
    }
  }
  document.getElementById('cartToggleBtn').addEventListener('click', toggleOrderPanel);
  orderPanelCloseBtn.addEventListener('click', closeOrderPanel);
  orderPanelBackdrop.addEventListener('click', closeOrderPanel);

  // ---------- RECEIPT DATE ----------
  document.getElementById('receiptDate').textContent = new Date().toLocaleString();

  // ---------- SETTINGS: NAVIGATION BETWEEN PANELS ----------
  var settingsNavItems = document.querySelectorAll('.settings-nav-item');
  var settingsPanels = document.querySelectorAll('.settings-panel');

  settingsNavItems.forEach(function(navItem){
    navItem.addEventListener('click', function(){
      var target = navItem.getAttribute('data-setting');
      settingsNavItems.forEach(function(n){ n.classList.toggle('active', n === navItem); });
      settingsPanels.forEach(function(panel){
        panel.style.display = (panel.id === 'settingsPanel-' + target) ? 'block' : 'none';
      });
    });
  });

  // ---------- SETTINGS: THEME MODE ----------
  var themeOptionLight = document.getElementById('themeOptionLight');
  var themeOptionDark = document.getElementById('themeOptionDark');

  function applyTheme(theme){
    document.body.classList.toggle('dark-theme', theme === 'dark');
    themeOptionLight.classList.toggle('active', theme === 'light');
    themeOptionDark.classList.toggle('active', theme === 'dark');
  }
  themeOptionLight.addEventListener('click', function(){ applyTheme('light'); });
  themeOptionDark.addEventListener('click', function(){ applyTheme('dark'); });

  // ---------- SETTINGS: LOW / CRITICAL STOCK ALERT ----------
  var lowStockThreshold = 10;
  var criticalStockThreshold = 3;
  var lowStockInput = document.getElementById('lowStockInput');
  var criticalStockInput = document.getElementById('criticalStockInput');
  var stockAlertError = document.getElementById('stockAlertError');
  var stockAlertSavedMsg = document.getElementById('stockAlertSavedMsg');

  document.getElementById('saveStockAlertBtn').addEventListener('click', function(){
    var low = parseInt(lowStockInput.value, 10);
    var critical = parseInt(criticalStockInput.value, 10);
    stockAlertSavedMsg.style.display = 'none';

    if(isNaN(low) || isNaN(critical) || low < 0 || critical < 0){
      stockAlertError.textContent = "Please enter valid numbers for both thresholds.";
      stockAlertError.style.display = 'block';
      return;
    }
    if(critical >= low){
      stockAlertError.textContent = "Critical Stock Alert should be lower than Low Stock Alert.";
      stockAlertError.style.display = 'block';
      return;
    }

    stockAlertError.style.display = 'none';
    lowStockThreshold = low;
    criticalStockThreshold = critical;
    stockAlertSavedMsg.style.display = 'inline-block';
  });

  // ---------- SETTINGS: STORE INFO ----------
  var storeNameInput = document.getElementById('storeNameInput');
  var storeCashierInput = document.getElementById('storeCashierInput');
  var storeInfoSavedMsg = document.getElementById('storeInfoSavedMsg');

  document.getElementById('saveStoreInfoBtn').addEventListener('click', function(){
    var bakeryName = storeNameInput.value.trim() || "The Corner Bakery";
    var cashierName = storeCashierInput.value.trim() || "Chef";

    document.querySelector('.receipt-title h2').textContent = bakeryName;
    document.querySelector('.welcome-text .who').textContent = 'Welcome, ' + cashierName + '!';
    document.querySelector('.welcome-text .role').textContent = 'Cashier · ' + bakeryName;

    storeInfoSavedMsg.style.display = 'inline-block';
  });

  // ---------- SETTINGS: DATA MANAGEMENT (RESET) ----------
  var resetConfirmOverlay = document.getElementById('resetConfirmOverlay');
  document.getElementById('resetDataBtn').addEventListener('click', function(){
    resetConfirmOverlay.classList.add('show');
  });
  document.getElementById('resetConfirmCancelBtn').addEventListener('click', function(){
    resetConfirmOverlay.classList.remove('show');
  });
  document.getElementById('resetConfirmOkBtn').addEventListener('click', function(){
    products.length = 0;
    salesHistory.length = 0;
    order = {};
    resetConfirmOverlay.classList.remove('show');
    renderCategories();
    renderProducts();
    renderOrder();
    renderStockList();
    setActiveView('home');
  });

  // ---------- STOCK ALERT DIALOG (LOW / CRITICAL) ----------
  var stockAlertOverlay = document.getElementById('stockAlertOverlay');
  var stockAlertBody = document.getElementById('stockAlertBody');

  function checkStockAlerts(breadIds){
    var criticalItems = [];
    var lowItems = [];

    breadIds.forEach(function(id){
      var p = products.find(function(pr){ return pr.id === id; });
      if(!p || p.cat !== 'Bread') return;
      var lot = (p.lot != null) ? p.lot : 0;
      if(lot <= criticalStockThreshold){
        criticalItems.push({ name: p.name, lot: lot });
      } else if(lot <= lowStockThreshold){
        lowItems.push({ name: p.name, lot: lot });
      }
    });

    if(criticalItems.length === 0 && lowItems.length === 0) return;

    var bodyHtml = "";
    if(criticalItems.length){
      bodyHtml += '<div class="stock-alert-section critical"><h4>⚠ Critical Stock</h4><ul>' +
        criticalItems.map(function(i){ return '<li>'+i.name+' — '+i.lot+' pcs left</li>'; }).join('') +
        '</ul></div>';
    }
    if(lowItems.length){
      bodyHtml += '<div class="stock-alert-section low"><h4>● Low Stock</h4><ul>' +
        lowItems.map(function(i){ return '<li>'+i.name+' — '+i.lot+' pcs left</li>'; }).join('') +
        '</ul></div>';
    }

    stockAlertBody.innerHTML = bodyHtml;
    stockAlertOverlay.classList.add('show');
  }

  document.getElementById('stockAlertOkBtn').addEventListener('click', function(){
    stockAlertOverlay.classList.remove('show');
  });

  // ---------- INIT ----------
  renderCategories();
  renderProducts();
  renderOrder();
  renderStockList();
})();

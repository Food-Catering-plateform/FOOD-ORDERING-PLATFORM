let editingItem = null;

document.getElementById('addProductForm').addEventListener('submit', function(e) {
  e.preventDefault();

  let name  = document.getElementById('foodName').value.trim();
  let price = document.getElementById('foodPrice').value;
  let qty   = document.getElementById('foodQty').value;
  let desc  = document.getElementById('foodDesc').value.trim();
  let file  = document.getElementById('foodImage').files[0];

  if (file) {
    let reader = new FileReader();
    reader.onload = function(e) {
      addItem(name, price, qty, desc, e.target.result);
    };
    reader.readAsDataURL(file);
  } else {
    let image = editingItem
      ? editingItem.querySelector('img').src
      : 'https://placehold.co/60x60/f5e6d3/7a4e27?text=Food';
    addItem(name, price, qty, desc, image);
  }
});

function addItem(name, price, qty, desc, image) {
  let list = document.getElementById('productList');

  let item = document.createElement('li');
  item.innerHTML =
    '<img src="' + image + '" alt="' + name + '">' +
    '<div class="info">' +
      '<strong>' + name + '</strong>' +
      '<span>Price: R ' + parseFloat(price).toFixed(2) + '</span>' +
      '<span>Qty: ' + qty + '</span>' +
      (desc ? '<em>' + desc + '</em>' : '') +
    '</div>' +
    '<button onclick="editItem(this)">Edit</button>' +
    '<button class="delete-btn" onclick="deleteItem(this)">Delete</button>';

  if (editingItem) {
    list.replaceChild(item, editingItem);
    editingItem = null;
    document.getElementById('submitBtn').textContent = 'Add Product';
  } else {
    list.appendChild(item);
  }

  document.getElementById('addProductForm').reset();
  updateEmptyMsg();
}

function editItem(btn) {
  let item = btn.parentElement;

  if (editingItem) editingItem.classList.remove('editing');

  editingItem = item;
  item.classList.add('editing');

  let spans = item.querySelectorAll('span');
  document.getElementById('foodName').value  = item.querySelector('strong').textContent;
  document.getElementById('foodPrice').value = spans[0].textContent.replace('Price: R ', '');
  document.getElementById('foodQty').value   = spans[1].textContent.replace('Qty: ', '');
  document.getElementById('foodDesc').value  = item.querySelector('em') ? item.querySelector('em').textContent : '';

  document.getElementById('submitBtn').textContent = 'Save Changes';
  document.getElementById('addProductForm').scrollIntoView({ behavior: 'smooth' });
}

function deleteItem(btn) {
  let item = btn.parentElement;

  if (editingItem === item) {
    editingItem = null;
    document.getElementById('submitBtn').textContent = 'Add Product';
    document.getElementById('addProductForm').reset();
  }

  item.remove();
  updateEmptyMsg();
}

function updateEmptyMsg() {
  let list = document.getElementById('productList');
  let msg  = document.getElementById('emptyMsg');
  msg.style.display = list.children.length === 0 ? 'block' : 'none';
}

updateEmptyMsg();

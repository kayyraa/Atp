const ProductDisplay = document.querySelector(".ProductDisplay");
const SignInButton = document.querySelector(".SignInButton");
const SignInDiv = document.querySelector(".SignIn");
const NameInput = document.querySelector(".NameInput");
const PasswordInput = document.querySelector(".PasswordInput");
const Topbar = document.querySelector(".Topbar");
const Cart = document.querySelector(`.Frames > div[href="Cart"]`);

const Products = new FireStorage("Products");
const Users = new FireStorage("Users");

let CartAddCooldown = false;
let Login = {};
const Local = localStorage.getItem("atp-account");
if (Local !== null) {
    const Parsed = JSON.parse(Local);
    const Documents = await Users.GetDocumentsByField("Name", Parsed.Name);
    const Document = Documents[0];
    if (!Document || Document.Password !== Parsed.Password) localStorage.removeItem("atp-account");
    else Login = Document;
}

SignInDiv.style.display = Object.keys(Login).length === 0 ? "" : "none";

function FormatPrice(Price) {
    return Price.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

async function UpdateCartTotal() {
    if (Object.keys(Login).length === 0) return;
    Cart.innerHTML = "";
    let Total = 0;
    for (const Item of Login.Cart) {
        const Document = await Products.GetDocument(Item.Id);
        Total += Document.Price * Item.Count;
        const Node = document.createElement("div");
        Node.innerHTML = `
            <img src="${Document.Images[0]}">
            <header>${Document.Name}</header>
            <div>
                <span style="border: none" class="Label">${Item.Count} - ${FormatPrice(Item.Count * Document.Price)}</span>
                ${Item.Ordered ? `<div class="ButtonClass Cancel">Siparişi Sil</div>` :
                    `
                        <div class="ButtonClass Add">Artır</div>
                        <div class="ButtonClass Delete">Eksilt</div>
                    `
                }
            </div>
        `;
        Cart.appendChild(Node);
        Node.querySelector(".Add").addEventListener("click", async () => {
            Item.Count += 1;
            await Users.UpdateDocument(Login.id, { Cart: Login.Cart });
            UpdateCartTotal();
        });
        Node.querySelector(".Delete").addEventListener("click", async () => {
            if (Item.Count > 1) Item.Count -= 1;
            else Login.Cart = Login.Cart.filter(I => I.Id !== Item.Id);
            await Users.UpdateDocument(Login.id, { Cart: Login.Cart });
            UpdateCartTotal();
        });
    }
    if (Total > 0) {
        const Purchase = document.createElement("span");
        Purchase.style.order = "2";
        Purchase.className = "ButtonClass Purchase";
        Purchase.textContent = `Siparişi Tamamla - ${FormatPrice(Total)}`;
        Cart.appendChild(Purchase);
        Purchase.addEventListener("click", async () => {
            Login.Cart = Login.Cart.map(Item => ({ ...Item, Ordered: true }));
            await Users.UpdateDocument(Login.id, { Cart: Login.Cart });
        });
    }
    Topbar.querySelector(`[href="Cart"]`).innerHTML = `<span>Sepet</span><span>•</span><span class="Total">${FormatPrice(Total)}</span>`;
}

function PopulateProductDisplay(Document, Rating) {
    const Fields = {
        ".Text > .Name": Document.Name,
        ".Text > .Description": Document.Description,
        ".Text > .Align > .Seller": Document.Seller,
        ".Text > .Align > .Rating": `${Rating.toFixed(1)}<img src="images/Star.svg">`,
        ".Text > .Align > .Price": FormatPrice(Document.Price),
    };

    ProductDisplay.setAttribute("ProductId", Document.id);
    ProductDisplay.style.display = "";
    ProductDisplay.querySelector(".Images").innerHTML = Document.Images.map(Image => `<img src="${Image}">`).join("");
    Object.entries(Fields).forEach(([Selector, Value]) => ProductDisplay.querySelector(Selector).innerHTML = Value);

    const Existing = Document.Reviews.find(Review => Review.Name === Login.Name);
    if (Existing) for (const Star of Array.from(ProductDisplay.querySelector(".Stars").children)) {
        if (Existing.Rating >= parseInt(Star.getAttribute("class"))) Star.setAttribute("Active", "");
    };

    const AddButton = ProductDisplay.querySelector(".Add");
    if (Document.Stock === 0) AddButton.setAttribute("Disabled", "");
    else AddButton.removeAttribute("Disabled");
    AddButton.innerHTML = Document.Stock === 0 ? "Stok Bitti" : "Sepete Ekle";
}

function AnimateToCart(ImageSrc) {
    const ImagesRect = document.querySelector(".Thumbnail").getBoundingClientRect();
    const CartRect = Topbar.querySelector(`[href="Cart"]`).getBoundingClientRect();

    const Notif = document.createElement("img");
    Notif.src = ImageSrc;
    Notif.setAttribute("style", `
        position: fixed;
        left: ${ImagesRect.left}px;
        top: ${ImagesRect.top}px;
        width: ${ImagesRect.width}px;
        height: ${ImagesRect.height}px;
        object-fit: cover;
        border-radius: 8px;
        z-index: 10;
        transition: all 0.5s ease;
    `);
    document.body.appendChild(Notif);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        Notif.style.left = `${CartRect.left}px`;
        Notif.style.top = `${CartRect.top}px`;
        Notif.style.width = "64px";
        Notif.style.height = "64px";
        Notif.style.opacity = "0";
    }));

    setTimeout(() => Notif.remove(), 600);
}

document.querySelectorAll(".Topbar > .Button").forEach(Button => {
    ["click", "touchstart"].forEach(EventType => {
        Button.addEventListener(EventType, () => {
            Frame(Button.getAttribute("href") || "Products");
            Button.setAttribute("Active", "");
            if (Button.getAttribute("href") !== "Products") ProductDisplay.style.display = "none";
            document.querySelectorAll(".Topbar > .Button").forEach(OtherButton => {
                if (OtherButton !== Button) OtherButton.removeAttribute("Active");
            });
        });
    });
});

await Products.GetDocuments().then((Documents) => {
    Documents.forEach(Document => {
        const Rating = Document.Reviews.length > 0
        ? Document.Reviews.reduce((Sum, Review) => Sum + Review.Rating, 0) / Document.Reviews.length
        : 0;

        const Product = document.createElement("div");
        Product.innerHTML = `
            <img class="Thumbnail" src="${Document.Images[0]}">
            <div>
                <span class="Name">${Document.Name}</span>
                <span class="Description">${Document.Description}</span>
                <div class="Align">
                    <div class="Seller">${Document.Seller}</div>
                    <div class="Rating">${Rating.toFixed(1)}<img src="images/Star.svg"></div>
                    <div class="Price">${FormatPrice(Document.Price)}</div>
                    <div ${Document.Stock === 0 ? "Disabled" : ""} class="Add">${Document.Stock === 0 ? "Stok Bitti" : "Sepete Ekle"}</div>
                </div>
            </div>
        `.replaceAll("\n", "");
        document.querySelector(`.Frames > div[href="Products"] > .Items`).appendChild(Product);

        ["touchstart", "mousedown", "click"].forEach(Name => {
            Product.querySelector(".Add").addEventListener(Name, async () => {
                if (Object.keys(Login).length === 0) return;
                if (CartAddCooldown) return;
                CartAddCooldown = true;
                setTimeout(() => CartAddCooldown = false, 250);
                if (Object.keys(Login).length === 0) return;
                const Existing = Login.Cart.find(Item => Item.Id === Document.id);
                if (Existing) Existing.Count += 1;
                else Login.Cart.push({ Id: Document.id, Count: 1 });
                await Users.UpdateDocument(Login.id, { Cart: Login.Cart });
                UpdateCartTotal();
                AnimateToCart(Document.Images[0]);
            });

            Product.addEventListener(Name, Event => {
                if (Event.target.classList.contains("Add")) return;
                PopulateProductDisplay(Document, Rating)
            });
        });
    });
});

ProductDisplay.querySelector(".Button.Back").addEventListener("click", () => {
    ProductDisplay.style.display = "none";
    ProductDisplay.removeAttribute("ProductId");
});

ProductDisplay.querySelector(".Button.Add").addEventListener("click", async () => {
    if (Object.keys(Login).length === 0) return;
    if (CartAddCooldown) return;
    CartAddCooldown = true;
    setTimeout(() => CartAddCooldown = false, 250);
    if (Object.keys(Login).length === 0) return;
    const Existing = Login.Cart.find(Item => Item.Id === Document.id);
    if (Existing) Existing.Count += 1;
    else Login.Cart.push({ Id: Document.id, Count: 1 });
    await Users.UpdateDocument(Login.id, { Cart: Login.Cart });
    UpdateCartTotal();
    AnimateToCart(Array.from(ProductDisplay.querySelector(".Images").children)[0].getAttribute("src"));
});

SignInButton.addEventListener("click", async () => {
    const Name = NameInput.value;
    const Password = PasswordInput.value;
    if (!Name || !Password) return;

    const UserObject = { Name, Password, Cart: [] };
    const Existing = (await Users.GetDocumentsByField("Name", Name))[0];

    if (Existing) {
        if (Existing.Password !== Password) return;
        localStorage.setItem("atp-account", JSON.stringify(Existing));
    } else {
        await Users.AppendDocument(UserObject);
        localStorage.setItem("atp-account", JSON.stringify(UserObject));
    }
    location.reload();
});

Array.from(ProductDisplay.querySelector(".Stars").children).forEach(Star => {
    Star.addEventListener("click", async () => {
        if (Object.keys(Login).length === 0) return;
        const ProductId = ProductDisplay.getAttribute("ProductId");
        if (!ProductId) return;
        for (const Child of Array.from(ProductDisplay.querySelector(".Stars").children)) {
            if (parseInt(Star.getAttribute("class")) >= parseInt(Child.getAttribute("class"))) Child.setAttribute("Active", "");
            else Child.removeAttribute("Active");
        };
        const Document = await Products.GetDocument(ProductId);
        const Existing = Document.Reviews.find(Review => Review.Name === Login.Name);
        if (Existing) Existing.Rating = parseInt(Star.getAttribute("class"));
        else Document.Reviews.push({ Name: Login.Name, Rating: parseInt(Star.getAttribute("class")) });
        await Products.UpdateDocument(ProductId, { Reviews: Document.Reviews });
    });
});

UpdateCartTotal();
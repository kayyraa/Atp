const ProductDisplay = document.querySelector(".ProductDisplay");
const SignInButton = document.querySelector(".SignInButton");
const SignInDiv = document.querySelector(".SignIn");
const NameInput = document.querySelector(".NameInput");
const PasswordInput = document.querySelector(".PasswordInput");
const Topbar = document.querySelector(".Topbar");
const Cart = document.querySelector(`.Frames > div[href="Cart"]`);

const Products = new FireStorage("Products");
const Users = new FireStorage("Users");

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

let Total = 0;
for (const Item of Login.Cart) {
    const Document = await Products.GetDocument(Item.Id);
    Total += Document.Price * Item.Count
    const Node = document.createElement("div");
    Node.innerHTML = `
        <img src="${Document.Images[0]}">
        <header>${Document.Name}</header>
        <div>
            <span class="Label">${Item.Count} - ${FormatPrice(Item.Count * Document.Price)}</span>
            <div class="ButtonClass Add">Artır</div>
            <div class="ButtonClass Delete">Eksilt</div>
        </div>
    `;
    Cart.appendChild(Node);
}

if (Total > 0) Cart.innerHTML += `<span class="ButtonClass Purchase">Siparişi Tamamla - ${FormatPrice(Total)}</span>`;

function FormatPrice(Price) {
    return Price.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

async function UpdateCartTotal() {
    if (Object.keys(Login).length === 0) return;
    let Total = 0;
    for (const Item of Login.Cart) {
        const Doc = await Products.GetDocument(Item.Id);
        Total += Doc.Price * Item.Count;
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

    const AddButton = ProductDisplay.querySelector(".Text > .Align > .Add");
    if (Document.Stock === 0) AddButton.setAttribute("Disabled", "");
    else AddButton.removeAttribute("Disabled");
    AddButton.querySelector(".Text").innerHTML = Document.Stock === 0 ? "Stok Bitti" : "Sepete Ekle";
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
            <img class="Thumbnail" src="https://github.com/kayyraa/DirectStorage/blob/main/atp/hq720.jpg?raw=true">
            <div>
                <span class="Name">${Document.Name}</span>
                <span class="Description">${Document.Description}</span>
                <div class="Align">
                    <div class="Seller">${Document.Seller}</div>
                    <div class="Rating">${Rating.toFixed(1)}<img src="images/Star.svg"></div>
                    <div class="Price">${FormatPrice(Document.Price)}</div>
                    <div ${Document.Stock === 0 ? "Disabled" : ""} class="Add">
                        <span class="Text">${Document.Stock === 0 ? "Stok Bitti" : "Sepete Ekle"}</span>
                        <img style="opacity: 0;" class="Icon" src="images/Tick.svg">
                    </div>
                </div>
            </div>
        `.replaceAll("\n", "");
        document.querySelector(`.Frames > div[href="Products"] > .Items`).appendChild(Product);

        Product.addEventListener("click", async Event => {
            const IsLoggedIn = Object.keys(Login).length !== 0;
            if (Event.target.getAttribute("class") === "Add" && IsLoggedIn && !Event.target.hasAttribute("Disabled")) {
                const Existing = Login.Cart.find(Item => Item.Id === Document.id);
                if (Existing) Existing.Count += 1;
                else Login.Cart.push({ Id: Document.id, Count: 1 });
                await Users.UpdateDocument(Login.id, { Cart: Login.Cart });
                UpdateCartTotal();
                AnimateToCart(Document.Images[0]);
                return;
            }

            PopulateProductDisplay(Document, Rating);
        });
    });
});

ProductDisplay.querySelector(".Button.Back").addEventListener("click", () => {
    ProductDisplay.style.display = "none";
    ProductDisplay.removeAttribute("ProductId");
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
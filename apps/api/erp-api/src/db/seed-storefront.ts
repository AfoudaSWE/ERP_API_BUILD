import { pool, transaction } from "./client.js";

const companyId = "20000000-0000-4000-8000-000000000001";
const categoryIds = [
  "41000000-0000-4000-8000-000000000001",
  "41000000-0000-4000-8000-000000000002",
  "41000000-0000-4000-8000-000000000003",
];
const productIds = [
  "42000000-0000-4000-8000-000000000001",
  "42000000-0000-4000-8000-000000000002",
  "42000000-0000-4000-8000-000000000003",
  "42000000-0000-4000-8000-000000000004",
  "42000000-0000-4000-8000-000000000005",
  "42000000-0000-4000-8000-000000000006",
];

const images = {
  laptop:
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80",
  monitor:
    "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80",
  keyboard:
    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80",
  paper:
    "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1200&q=80",
  chair:
    "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=1200&q=80",
  coffee:
    "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1200&q=80",
  hero: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1800&q=85",
};

export async function seedStorefrontData() {
  await transaction(async (client) => {
    const company = await client.query("SELECT id FROM companies WHERE id=$1", [
      companyId,
    ]);
    if (!company.rowCount)
      throw new Error("Run npm run db:seed before db:seed:storefront");

    const settingsConfiguration = {
      announcement:
        "Fresh technology, real-time stock, and delivery across Egypt",
      announcementAr: "أحدث التقنيات ومخزون محدث وتوصيل داخل مصر",
      announcementBadge: "New",
      locationLabel: "Cairo & Giza",
      locationLabelAr: "القاهرة والجيزة",
      utilityLinks: [],
      socialLinks: [],
    };
    await client.query(
      `INSERT INTO storefront_settings(company_id,is_default,store_name,store_name_ar,currency,default_locale,support_phone,support_email,seo_title,seo_description,configuration)
       VALUES($1,true,'Nexa Tech Store','متجر نكسا للتقنية','EGP','en','0100 555 0199','support@nexa.demo','Nexa Tech Store | Electronics and Office Essentials','Development storefront populated from PostgreSQL mock commerce data.',$2::jsonb)
       ON CONFLICT(company_id) DO UPDATE SET store_name=excluded.store_name,store_name_ar=excluded.store_name_ar,currency=excluded.currency,default_locale=excluded.default_locale,support_phone=excluded.support_phone,support_email=excluded.support_email,seo_title=excluded.seo_title,seo_description=excluded.seo_description,configuration=excluded.configuration,updated_at=now()`,
      [companyId, JSON.stringify(settingsConfiguration)],
    );

    const baseCategories = [
      [
        categoryIds[0],
        "Electronics",
        "إلكترونيات",
        "electronics",
        images.laptop,
      ],
      [
        categoryIds[1],
        "Office supplies",
        "مستلزمات مكتبية",
        "office-supplies",
        images.paper,
      ],
      [
        categoryIds[2],
        "Home appliances",
        "أجهزة منزلية",
        "home-appliances",
        images.coffee,
      ],
    ];
    for (const [id, name, nameAr, slug, imageUrl] of baseCategories) {
      await client.query(
        `INSERT INTO categories(id,company_id,name,name_ar,type,is_active,slug,image_url) VALUES($1,$2,$3,$4,'product',true,$5,$6)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_ar=excluded.name_ar,slug=excluded.slug,image_url=excluded.image_url,is_active=true`,
        [id, companyId, name, nameAr, slug, imageUrl],
      );
    }

    const baseProducts = [
      [
        productIds[0],
        categoryIds[0],
        "EL-LAP-001",
        "Business Laptop 15",
        "حاسوب أعمال 15 بوصة",
        24500,
        28900,
        35,
      ],
      [
        productIds[1],
        categoryIds[0],
        "EL-MON-002",
        "24-inch Monitor",
        "شاشة 24 بوصة",
        4800,
        5900,
        18,
      ],
      [
        productIds[2],
        categoryIds[0],
        "EL-KBD-003",
        "Wireless Keyboard",
        "لوحة مفاتيح لاسلكية",
        620,
        850,
        75,
      ],
      [
        productIds[3],
        categoryIds[1],
        "OF-PAP-001",
        "A4 Copy Paper Box",
        "كرتونة ورق تصوير A4",
        920,
        1150,
        42,
      ],
      [
        productIds[4],
        categoryIds[1],
        "OF-CHR-002",
        "Ergonomic Office Chair",
        "كرسي مكتب مريح",
        3850,
        4900,
        9,
      ],
      [
        productIds[5],
        categoryIds[2],
        "HA-CFM-001",
        "Coffee Maker",
        "ماكينة قهوة",
        2100,
        2750,
        24,
      ],
    ];
    for (const row of baseProducts) {
      await client.query(
        `INSERT INTO products(id,company_id,category_id,sku,name,name_ar,unit,type,cost_price,selling_price,tax_rate,min_stock_level,reorder_level,total_stock,is_active)
         VALUES($1,$2,$3,$4,$5,$6,'piece','product',$7,$8,14,5,10,$9,true)
         ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id,sku=excluded.sku,name=excluded.name,name_ar=excluded.name_ar,cost_price=excluded.cost_price,selling_price=excluded.selling_price,total_stock=excluded.total_stock,is_active=true,updated_at=now()`,
        [row[0], companyId, ...row.slice(1)],
      );
    }

    const warehouse = (
      await client.query<{ id: string }>(
        `SELECT id FROM warehouses
         WHERE company_id=$1 AND is_active=true
         ORDER BY (warehouse_type='main') DESC, created_at, id
         LIMIT 1`,
        [companyId],
      )
    ).rows[0] ?? (
      await client.query<{ id: string }>(
        `INSERT INTO warehouses(company_id,code,name,name_ar,warehouse_type,is_active)
         VALUES($1,'STOREFRONT','Storefront warehouse','مخزن المتجر','main',true)
         ON CONFLICT(company_id,code) DO UPDATE SET is_active=true,updated_at=now()
         RETURNING id`,
        [companyId],
      )
    ).rows[0];

    for (const productId of productIds) {
      await client.query(
        `INSERT INTO inventory_balances(company_id,warehouse_id,product_id,on_hand,reserved,average_cost)
         SELECT $1,$2,id,total_stock,0,cost_price FROM products WHERE company_id=$1 AND id=$3
         ON CONFLICT(company_id,warehouse_id,product_id) DO NOTHING`,
        [companyId, warehouse.id, productId],
      );
    }

    const categoryData = [
      [categoryIds[0], "electronics", images.laptop],
      [categoryIds[1], "office-supplies", images.paper],
      [categoryIds[2], "home-appliances", images.coffee],
    ];
    for (const [id, slug, imageUrl] of categoryData) {
      await client.query(
        "UPDATE categories SET slug=$2,image_url=$3,is_active=true WHERE id=$1 AND company_id=$4",
        [id, slug, imageUrl, companyId],
      );
    }

    const productData = [
      [
        productIds[0],
        "business-laptop-15",
        "Nexa",
        31900,
        "A dependable 15-inch laptop for daily business, reporting, and collaboration.",
        "حاسوب محمول مقاس 15 بوصة للأعمال اليومية والتقارير والتعاون.",
      ],
      [
        productIds[1],
        "24-inch-monitor",
        "ViewPro",
        6900,
        "A crisp Full HD display with an ergonomic stand and modern connectivity.",
        "شاشة عالية الوضوح مع حامل مريح وخيارات توصيل حديثة.",
      ],
      [
        productIds[2],
        "wireless-keyboard",
        "Nexa",
        1050,
        "Quiet wireless keyboard with a compact layout and long battery life.",
        "لوحة مفاتيح لاسلكية هادئة بتصميم مدمج وعمر بطارية طويل.",
      ],
      [
        productIds[3],
        "a4-copy-paper-box",
        "OfficeOne",
        1290,
        "Reliable bright white A4 paper for everyday office printing.",
        "ورق أبيض موثوق مقاس A4 للطباعة المكتبية اليومية.",
      ],
      [
        productIds[4],
        "ergonomic-office-chair",
        "WorkWell",
        5900,
        "Supportive adjustable office chair designed for long working sessions.",
        "كرسي مكتب مريح وقابل للتعديل لجلسات العمل الطويلة.",
      ],
      [
        productIds[5],
        "coffee-maker",
        "HomeBrew",
        3290,
        "Compact coffee maker with reusable filter and automatic keep-warm mode.",
        "ماكينة قهوة مدمجة بفلتر قابل لإعادة الاستخدام ووضع حفظ الحرارة.",
      ],
    ];
    for (const row of productData) {
      await client.query(
        `UPDATE products SET slug=$2,brand=$3,compare_at_price=$4,description=$5,description_ar=$6,storefront_visible=true,commerce_status='active',published_at=COALESCE(published_at,now()-interval '7 days'),seo_title=name || ' | Nexa Tech Store',seo_description=$5,updated_at=now() WHERE id=$1 AND company_id=$7`,
        [...row, companyId],
      );
    }

    const productImages = [
      images.laptop,
      images.monitor,
      images.keyboard,
      images.paper,
      images.chair,
      images.coffee,
    ];
    for (let index = 0; index < productIds.length; index += 1) {
      await client.query(
        `INSERT INTO product_media(id,company_id,product_id,url,thumbnail_url,alt_text,media_type,position,width,height) VALUES($1,$2,$3,$4,$4,(SELECT name FROM products WHERE id=$3),'image',0,1200,900) ON CONFLICT(id) DO UPDATE SET url=excluded.url,thumbnail_url=excluded.thumbnail_url,alt_text=excluded.alt_text,position=0`,
        [
          `51000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          companyId,
          productIds[index],
          productImages[index],
        ],
      );
      await client.query(
        `INSERT INTO product_reviews(id,company_id,product_id,rating,title,body,status,created_at) VALUES($1,$2,$3,$4,'Verified demo review','Seeded review used to exercise API-derived ratings.','approved',now()-($5::text || ' days')::interval) ON CONFLICT(id) DO UPDATE SET rating=excluded.rating,status='approved'`,
        [
          `52000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          companyId,
          productIds[index],
          4 + (index % 2),
          index + 1,
        ],
      );
    }

    await client.query(
      `INSERT INTO product_variants(id,company_id,product_id,sku,name,attributes,selling_price,compare_at_price,stock_quantity,image_url,is_active) VALUES
       ('53000000-0000-4000-8000-000000000001',$1,$2,'EL-LAP-001-8GB','8 GB / 256 GB','{"memory":"8 GB","storage":"256 GB"}',28900,31900,18,$3,true),
       ('53000000-0000-4000-8000-000000000002',$1,$2,'EL-LAP-001-16GB','16 GB / 512 GB','{"memory":"16 GB","storage":"512 GB"}',33400,35900,12,$3,true)
       ON CONFLICT(id) DO UPDATE SET selling_price=excluded.selling_price,compare_at_price=excluded.compare_at_price,stock_quantity=excluded.stock_quantity,is_active=true`,
      [companyId, productIds[0], images.laptop],
    );

    const sections = [
      [
        "54000000-0000-4000-8000-000000000001",
        "hero",
        "Technology that works for your business",
        "تقنية تدعم نجاح أعمالك",
        "Shop practical electronics and office essentials with live prices and stock.",
        "تسوق الإلكترونيات ومستلزمات المكتب بأسعار ومخزون محدث.",
        {
          eyebrow: "Development storefront",
          eyebrowAr: "متجر تجريبي",
          cta: "Shop electronics",
          ctaAr: "تسوق الإلكترونيات",
          targetUrl: "/products?category=electronics",
          desktopImage: images.hero,
          mobileImage: images.hero,
          imageAlt: "Laptop on a modern desk",
          backgroundColor: "#edf3ff",
          textColor: "#101828",
          secondaryCards: [
            {
              label: "Work smarter",
              labelAr: "اعمل بذكاء",
              title: "Displays for every desk",
              titleAr: "شاشات لكل مكتب",
              image: images.monitor,
              targetUrl: "/products?category=electronics",
              backgroundColor: "#e9f7f2",
            },
            {
              label: "Wireless",
              labelAr: "لاسلكي",
              title: "A cleaner setup",
              titleAr: "مساحة أكثر ترتيباً",
              image: images.keyboard,
              targetUrl: "/product/wireless-keyboard",
              backgroundColor: "#f4edff",
            },
            {
              label: "Comfort",
              labelAr: "راحة",
              title: "Built for long sessions",
              titleAr: "مصمم لساعات العمل",
              image: images.chair,
              targetUrl: "/product/ergonomic-office-chair",
              backgroundColor: "#fff1e8",
            },
            {
              label: "Home edit",
              labelAr: "اختيارات المنزل",
              title: "Better coffee breaks",
              titleAr: "استراحة قهوة أفضل",
              image: images.coffee,
              targetUrl: "/product/coffee-maker",
              backgroundColor: "#f7efe6",
            },
          ],
        },
      ],
      [
        "54000000-0000-4000-8000-000000000002",
        "category_grid",
        "Shop by category",
        "تسوق حسب الفئة",
        "Find the equipment your team needs.",
        "اعثر على ما يحتاجه فريقك.",
        { categoryIds, maxItems: 6 },
      ],
      [
        "54000000-0000-4000-8000-000000000003",
        "product_grid",
        "Featured products",
        "منتجات مختارة",
        "Popular products selected for the demo storefront.",
        "منتجات شائعة مختارة للمتجر التجريبي.",
        { productIds, maxItems: 6, sort: "newest" },
      ],
      [
        "54000000-0000-4000-8000-000000000008",
        "product_grid",
        "New arrivals",
        "وصل حديثاً",
        "Recently published technology, priced and stocked by the API.",
        "أحدث المنتجات المنشورة بأسعار ومخزون من واجهة API.",
        {
          category: "electronics",
          maxItems: 6,
          sort: "newest",
          targetUrl: "/products?category=electronics&sort=newest",
        },
      ],
      [
        "54000000-0000-4000-8000-000000000009",
        "product_grid",
        "Office essentials",
        "أساسيات المكتب",
        "Practical picks for a more comfortable workday.",
        "اختيارات عملية ليوم عمل أكثر راحة.",
        {
          category: "office-supplies",
          maxItems: 6,
          sort: "discount",
          targetUrl: "/products?category=office-supplies&sort=discount",
        },
      ],
      [
        "54000000-0000-4000-8000-000000000004",
        "brand_grid",
        "Brands in store",
        "العلامات المتوفرة",
        "Browse products by their database-managed brand.",
        "تصفح المنتجات حسب العلامة المسجلة.",
        { brands: ["Nexa", "ViewPro", "OfficeOne", "WorkWell", "HomeBrew"] },
      ],
      [
        "54000000-0000-4000-8000-000000000005",
        "promo_banner",
        "Upgrade your workspace",
        "طور مساحة عملك",
        "Monitors, chairs, and accessories for a more productive day.",
        "شاشات وكراسٍ وإكسسوارات ليوم أكثر إنتاجية.",
        {
          eyebrow: "Workspace edit",
          eyebrowAr: "تجهيز المكتب",
          cta: "Explore office picks",
          ctaAr: "اكتشف اختيارات المكتب",
          targetUrl: "/products?category=office-supplies",
          desktopImage: images.chair,
          announcement:
            "Demo data is now live — prices and stock come from the API.",
          announcementAr:
            "البيانات التجريبية متاحة الآن — الأسعار والمخزون من واجهة API.",
          cards: [
            {
              label: "Fast delivery",
              labelAr: "توصيل سريع",
              title: "Ready for your next workday",
              titleAr: "جاهز ليوم عملك القادم",
              image: images.laptop,
              targetUrl: "/products?category=electronics",
            },
            {
              label: "Workspace",
              labelAr: "مساحة العمل",
              title: "Sharper views",
              titleAr: "رؤية أوضح",
              image: images.monitor,
              targetUrl: "/product/24-inch-monitor",
            },
            {
              label: "Comfort",
              labelAr: "راحة",
              title: "Support that lasts",
              titleAr: "دعم يدوم طويلاً",
              image: images.chair,
              targetUrl: "/product/ergonomic-office-chair",
            },
            {
              label: "Everyday",
              labelAr: "للاستخدام اليومي",
              title: "Quiet wireless control",
              titleAr: "تحكم لاسلكي هادئ",
              image: images.keyboard,
              targetUrl: "/product/wireless-keyboard",
            },
            {
              label: "At home",
              labelAr: "في المنزل",
              title: "Start with fresh coffee",
              titleAr: "ابدأ بقهوة طازجة",
              image: images.coffee,
              targetUrl: "/product/coffee-maker",
            },
          ],
        },
      ],
      [
        "54000000-0000-4000-8000-000000000006",
        "service_benefits",
        "",
        "",
        "",
        "",
        {
          items: [
            {
              title: "Server-verified stock",
              titleAr: "مخزون موثوق من الخادم",
              description: "Availability is checked before cart updates.",
              descriptionAr: "يتم التحقق من التوفر قبل تحديث السلة.",
            },
            {
              title: "Configured delivery",
              titleAr: "توصيل قابل للإعداد",
              description: "Shipping methods come from the database.",
              descriptionAr: "طرق الشحن مصدرها قاعدة البيانات.",
            },
            {
              title: "Secure checkout flow",
              titleAr: "مسار دفع آمن",
              description: "Totals are recalculated by the API.",
              descriptionAr: "تتم إعادة حساب الإجماليات عبر API.",
            },
          ],
        },
      ],
      [
        "54000000-0000-4000-8000-000000000007",
        "newsletter",
        "Get product updates",
        "احصل على تحديثات المنتجات",
        "Demo newsletter presentation; submission is not persisted yet.",
        "عرض تجريبي للنشرة؛ الاشتراك غير محفوظ حالياً.",
        {},
      ],
    ];
    const sectionOrder: Record<string, number> = {
      "54000000-0000-4000-8000-000000000002": 1,
      "54000000-0000-4000-8000-000000000001": 2,
      "54000000-0000-4000-8000-000000000006": 3,
      "54000000-0000-4000-8000-000000000008": 4,
      "54000000-0000-4000-8000-000000000003": 5,
      "54000000-0000-4000-8000-000000000009": 6,
      "54000000-0000-4000-8000-000000000005": 7,
      "54000000-0000-4000-8000-000000000004": 8,
      "54000000-0000-4000-8000-000000000007": 9,
    };
    for (let index = 0; index < sections.length; index += 1) {
      const [id, type, title, titleAr, subtitle, subtitleAr, configuration] =
        sections[index];
      await client.query(
        `INSERT INTO cms_homepage_sections(id,company_id,section_type,title,title_ar,subtitle,subtitle_ar,configuration,status,display_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'published',$9) ON CONFLICT(id) DO UPDATE SET title=excluded.title,title_ar=excluded.title_ar,subtitle=excluded.subtitle,subtitle_ar=excluded.subtitle_ar,configuration=excluded.configuration,status='published',display_order=excluded.display_order,updated_at=now()`,
        [
          id,
          companyId,
          type,
          title,
          titleAr,
          subtitle,
          subtitleAr,
          JSON.stringify(configuration),
          sectionOrder[String(id)] ?? index + 1,
        ],
      );
    }

    const navigation = [
      [
        "55000000-0000-4000-8000-000000000001",
        "Electronics",
        "إلكترونيات",
        "electronics",
      ],
      [
        "55000000-0000-4000-8000-000000000002",
        "Office supplies",
        "مستلزمات مكتبية",
        "office-supplies",
      ],
      [
        "55000000-0000-4000-8000-000000000003",
        "Home appliances",
        "أجهزة منزلية",
        "home-appliances",
      ],
    ];
    for (let index = 0; index < navigation.length; index += 1) {
      const [id, label, labelAr, targetValue] = navigation[index];
      await client.query(
        `INSERT INTO storefront_navigation_items(id,company_id,label,label_ar,target_type,target_value,status,display_order) VALUES($1,$2,$3,$4,'category',$5,'published',$6) ON CONFLICT(id) DO UPDATE SET label=excluded.label,label_ar=excluded.label_ar,target_value=excluded.target_value,status='published',display_order=excluded.display_order,updated_at=now()`,
        [id, companyId, label, labelAr, targetValue, index + 1],
      );
    }

    await client.query(
      `INSERT INTO shipping_methods(id,company_id,name,name_ar,description,fee,is_enabled,configuration) VALUES
       ('56000000-0000-4000-8000-000000000001',$1,'Standard delivery','توصيل عادي','Delivery in 3–5 business days',65,true,'{"estimatedDays":"3-5"}'),
       ('56000000-0000-4000-8000-000000000002',$1,'Express delivery','توصيل سريع','Delivery in 1–2 business days',120,true,'{"estimatedDays":"1-2"}')
       ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_ar=excluded.name_ar,description=excluded.description,fee=excluded.fee,is_enabled=true,configuration=excluded.configuration`,
      [companyId],
    );
    await client.query(
      `INSERT INTO payment_methods(id,company_id,code,name,name_ar,instructions,is_enabled,configuration) VALUES
       ('57000000-0000-4000-8000-000000000001',$1,'cash_on_delivery','Cash on delivery','الدفع عند الاستلام','Pay the courier when your order arrives.',true,'{}'),
       ('57000000-0000-4000-8000-000000000002',$1,'bank_transfer','Bank transfer','تحويل بنكي','Demo method; payment instructions are supplied after order creation.',true,'{}')
       ON CONFLICT(company_id,code) DO UPDATE SET name=excluded.name,name_ar=excluded.name_ar,instructions=excluded.instructions,is_enabled=true,configuration=excluded.configuration`,
      [companyId],
    );
  });

  const counts = await pool.query(
    `SELECT
      (SELECT count(*) FROM products WHERE company_id=$1 AND storefront_visible=true AND published_at IS NOT NULL)::int products,
      (SELECT count(*) FROM cms_homepage_sections WHERE company_id=$1 AND status='published')::int sections,
      (SELECT count(*) FROM storefront_navigation_items WHERE company_id=$1 AND status='published')::int navigation`,
    [companyId],
  );
  console.log("Demo storefront data ready:", counts.rows[0]);
}

if (require.main === module) {
  seedStorefrontData()
    .then(() => pool.end())
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

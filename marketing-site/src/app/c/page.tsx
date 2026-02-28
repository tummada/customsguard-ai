import { products } from "@/config/products";
import { LandingTemplate } from "@/components/LandingTemplate";

export default function HSCodeLandingPage() {
    // In a dynamic route like [product]/page.tsx, you would extract params.product
    // Since this is specific to /c, we hardcode to hs-code config.
    const config = products["hs-code"];

    // Optional: handle 404 if config doesn't exist
    if (!config) return <div>Product Not Found</div>;

    return <LandingTemplate config={config} />;
}

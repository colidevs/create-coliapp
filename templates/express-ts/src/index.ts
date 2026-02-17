import { log } from "@/lib/logger";
import { api } from "./api";
import { config } from "./config";

const PORT = config.port;

api.listen(PORT, () => {
	log(`Server running on http://localhost:${PORT}`);
});

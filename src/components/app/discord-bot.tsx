import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, Globe } from "lucide-react";

export function DiscordBotPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="hover:text-white">
          <svg
            viewBox="0 -28.5 256 256"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid"
            fill="#000000"
          >
            <g id="SVGRepo_bgCarrier" strokeWidth="0" />
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
            <g id="SVGRepo_iconCarrier">
              <g>
                <path
                  d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z"
                  fill="#ffffff"
                  fillRule="nonzero"
                />
              </g>
            </g>
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
              <img
                src="https://cdn.egdata.app/logo_simple_white_clean.png"
                alt="egdata"
                className="size-16 rounded-full"
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg">egdata.app</h3>
              <p className="text-xs text-muted-foreground">Official Discord bot for egdata.app</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Badge variant="secondary" className="text-xs">
              <Check className="w-3 h-3 mr-1" />
              Verified
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Globe className="w-3 h-3 mr-1" />
              Public
            </Badge>
          </div>
          {/* <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Server className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>100,000+ servers</span>
            </div>
            <div className="flex items-center text-sm">
              <Users className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>1,000,000+ users</span>
            </div>
          </div> */}
          <Button
            className="w-full bg-indigo-500 text-white hover:bg-indigo-600 hover:text-white"
            onClick={() => {
              // Open a browser popup to invite the bot to your server
              window.open(
                "https://discord.com/oauth2/authorize?client_id=1270522540992888832",
                "_blank",
                "width=1000,height=700",
              );
            }}
          >
            Add to Server
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
